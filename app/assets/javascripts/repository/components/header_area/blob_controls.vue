<script>
import { GlButton, GlTooltipDirective, GlLoadingIcon } from '@gitlab/ui';
import { computed } from 'vue';
import { __ } from '~/locale';
import { logError } from '~/lib/logger';
import { visitUrl } from '~/lib/utils/url_utility';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import { createAlert } from '~/alert';
import getRefMixin from '~/repository/mixins/get_ref';
import glFeatureFlagMixin from '~/vue_shared/mixins/gl_feature_flags_mixin';
import initSourcegraph from '~/sourcegraph';
import Shortcuts from '~/behaviors/shortcuts/shortcuts';
import { addShortcutsExtension } from '~/behaviors/shortcuts';
import { shouldDisableShortcuts } from '~/behaviors/shortcuts/shortcuts_toggle';
import ShortcutsBlob from '~/behaviors/shortcuts/shortcuts_blob';
import { shortcircuitPermalinkButton } from '~/blob/utils';
import BlobLinePermalinkUpdater from '~/blob/blob_line_permalink_updater';
import {
  keysFor,
  START_SEARCH_PROJECT_FILE,
  PROJECT_FILES_GO_TO_PERMALINK,
} from '~/behaviors/shortcuts/keybindings';
import { sanitize } from '~/lib/dompurify';
import { InternalEvents } from '~/tracking';
import { FIND_FILE_BUTTON_CLICK, BLAME_BUTTON_CLICK } from '~/tracking/constants';
import {
  showSingleFileEditorForkSuggestion,
  showWebIdeForkSuggestion,
  isIdeTarget,
  forkSuggestionForSelectedEditor,
} from '~/repository/utils/fork_suggestion_utils';
import { showBlameButton, isUsingLfs } from '~/repository/utils/storage_info_utils';
import blobControlsQuery from '~/repository/queries/blob_controls.query.graphql';
import userGitpodInfo from '~/repository/queries/user_gitpod_info.query.graphql';
import applicationInfoQuery from '~/blob/queries/application_info.query.graphql';
import { getRefType } from '~/repository/utils/ref_type';
import OpenMrBadge from '~/repository/components/header_area/open_mr_badge.vue';
import BlobOverflowMenu from 'ee_else_ce/repository/components/header_area/blob_overflow_menu.vue';
import ForkSuggestionModal from '~/repository/components/header_area/fork_suggestion_modal.vue';
import { TEXT_FILE_TYPE, EMPTY_FILE, DEFAULT_BLOB_INFO } from '../../constants';

export default {
  i18n: {
    findFile: __('Find file'),
    blame: __('Blame'),
    permalink: __('Permalink'),
    permalinkTooltip: __('Go to permalink'),
    errorMessage: __('An error occurred while loading the blob controls.'),
  },
  buttonClassList: 'sm:gl-w-auto gl-w-full sm:gl-mt-0 gl-mt-3',
  components: {
    OpenMrBadge,
    GlButton,
    GlLoadingIcon,
    BlobOverflowMenu,
    ForkSuggestionModal,
    WebIdeLink: () => import('ee_else_ce/vue_shared/components/web_ide_link.vue'),
  },
  directives: {
    GlTooltip: GlTooltipDirective,
  },
  mixins: [getRefMixin, glFeatureFlagMixin(), InternalEvents.mixin()],
  apollo: {
    project: {
      query: blobControlsQuery,
      variables() {
        return {
          projectPath: this.projectPath,
          filePath: this.filePath,
          ref: this.ref,
          refType: getRefType(this.refType),
        };
      },
      skip() {
        return !this.filePath;
      },
      error(error) {
        createAlert({ message: this.$options.i18n.errorMessage });
        logError(
          `Failed to fetch blob controls. See exception details for more information.`,
          error,
        );
        Sentry.captureException(error);
      },
    },
    currentUser: {
      query: userGitpodInfo,
      error(error) {
        createAlert({ message: this.$options.i18n.errorMessage });
        logError(
          `Failed to fetch current user. See exception details for more information.`,
          error,
        );
        Sentry.captureException(error);
      },
    },
    gitpodEnabled: {
      query: applicationInfoQuery,
      error(error) {
        createAlert({ message: this.$options.i18n.errorMessage });
        logError(
          `Failed to fetch application info. See exception details for more information.`,
          error,
        );
        Sentry.captureException(error);
      },
    },
  },
  inject: ['currentRef'],
  provide() {
    return {
      blobInfo: computed(() => this.blobInfo ?? DEFAULT_BLOB_INFO.repository.blobs.nodes[0]),
      currentRef: computed(() => this.currentRef ?? this.blobInfo.ref),
    };
  },
  props: {
    projectPath: {
      type: String,
      required: true,
    },
    projectIdAsNumber: {
      type: Number,
      required: true,
    },
    refType: {
      type: String,
      required: false,
      default: null,
    },
    isBinary: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      project: {},
      currentUser: {},
      gitpodEnabled: false,
      isForkSuggestionModalVisible: false,
    };
  },
  computed: {
    isLoadingRepositoryBlob() {
      return this.$apollo.queries.project.loading;
    },
    filePath() {
      return this.$route.params.path;
    },
    blobInfo() {
      return this.project?.repository?.blobs?.nodes[0] || {};
    },
    userPermissions() {
      return this.project?.userPermissions || DEFAULT_BLOB_INFO.userPermissions;
    },
    showBlameButton() {
      return showBlameButton(this.blobInfo);
    },
    isUsingLfs() {
      return isUsingLfs(this.blobInfo);
    },
    isBinaryFileType() {
      return (
        this.isBinary ||
        (this.blobInfo.simpleViewer?.fileType !== TEXT_FILE_TYPE &&
          this.blobInfo.simpleViewer?.fileType !== EMPTY_FILE)
      );
    },
    rawPath() {
      return this.blobInfo.externalStorageUrl || this.blobInfo.rawPath;
    },
    shortcuts() {
      const findFileKey = keysFor(START_SEARCH_PROJECT_FILE)[0];
      const permalinkKey = keysFor(PROJECT_FILES_GO_TO_PERMALINK)[0];

      return {
        findFile: findFileKey,
        permalink: permalinkKey,
      };
    },
    findFileShortcutKey() {
      return this.shortcuts.findFile;
    },
    findFileTooltip() {
      if (shouldDisableShortcuts()) return null;

      const { description } = START_SEARCH_PROJECT_FILE;
      return this.formatTooltipWithShortcut(description, this.shortcuts.findFile);
    },
    permalinkShortcutKey() {
      return this.shortcuts.permalink;
    },
    permalinkTooltip() {
      if (shouldDisableShortcuts()) return null;

      const description = this.$options.i18n.permalinkTooltip;
      return this.formatTooltipWithShortcut(description, this.shortcuts.permalink);
    },
    showWebIdeLink() {
      return !this.blobInfo.archived && this.blobInfo.editBlobPath;
    },
    shouldShowSingleFileEditorForkSuggestion() {
      return showSingleFileEditorForkSuggestion(
        this.userPermissions,
        this.isUsingLfs,
        this.blobInfo.canModifyBlob,
      );
    },
    shouldShowWebIdeForkSuggestion() {
      return showWebIdeForkSuggestion(
        this.userPermissions,
        this.isUsingLfs,
        this.blobInfo.canModifyBlobWithWebIde,
      );
    },
  },
  watch: {
    blobInfo() {
      initSourcegraph();
      this.$nextTick(() => {
        this.initShortcuts();
        this.initLinksUpdate();
      });
    },
  },
  methods: {
    formatTooltipWithShortcut(description, key) {
      return sanitize(`${description} <kbd class="flat gl-ml-1" aria-hidden=true>${key}</kbd>`);
    },
    initShortcuts() {
      shortcircuitPermalinkButton();
      addShortcutsExtension(ShortcutsBlob);
    },
    initLinksUpdate() {
      // eslint-disable-next-line no-new
      new BlobLinePermalinkUpdater(
        document.querySelector('.tree-holder'),
        '.file-line-num[data-line-number], .file-line-num[data-line-number] *',
        document.querySelectorAll('.js-data-file-blob-permalink-url, .js-blob-blame-link'),
      );
    },
    handleFindFile() {
      this.trackEvent(FIND_FILE_BUTTON_CLICK);
      Shortcuts.focusSearchFile();
    },
    handleBlameClick() {
      this.trackEvent(BLAME_BUTTON_CLICK);
    },
    onCopy() {
      navigator.clipboard.writeText(this.blobInfo.rawTextBlob);
    },
    onShowForkSuggestion() {
      this.isForkSuggestionModalVisible = true;
    },
    onEdit(target) {
      const { ideEditPath, editBlobPath } = this.blobInfo;
      const showForkSuggestionForSelectedEditor = forkSuggestionForSelectedEditor(
        target,
        this.shouldShowWebIdeForkSuggestion,
        this.shouldShowSingleFileEditorForkSuggestion,
      );

      if (showForkSuggestionForSelectedEditor) {
        this.isForkSuggestionModalVisible = true;
      } else {
        visitUrl(isIdeTarget(target) ? ideEditPath : editBlobPath);
      }
    },
    onLockedFile(event) {
      this.$emit('lockedFile', event);
    },
  },
};
</script>
<template>
  <div
    class="gl-flex gl-flex-wrap gl-items-center gl-gap-3 gl-self-end"
    data-testid="blob-controls"
  >
    <open-mr-badge
      v-if="glFeatures.filterBlobPath"
      :project-path="projectPath"
      :blob-path="filePath"
    />
    <gl-button
      v-gl-tooltip.html="findFileTooltip"
      :aria-keyshortcuts="findFileShortcutKey"
      data-testid="find"
      :class="[
        $options.buttonClassList,
        { 'gl-hidden sm:gl-inline-flex': glFeatures.blobOverflowMenu },
      ]"
      @click="handleFindFile"
    >
      {{ $options.i18n.findFile }}
    </gl-button>
    <gl-button
      v-if="showBlameButton"
      data-testid="blame"
      :href="blobInfo.blamePath"
      :class="[
        $options.buttonClassList,
        { 'gl-hidden sm:gl-inline-flex': glFeatures.blobOverflowMenu },
      ]"
      class="js-blob-blame-link"
      @click="handleBlameClick"
    >
      {{ $options.i18n.blame }}
    </gl-button>

    <gl-button
      v-if="!glFeatures.blobOverflowMenu"
      v-gl-tooltip.html="permalinkTooltip"
      :aria-keyshortcuts="permalinkShortcutKey"
      data-testid="permalink"
      :href="blobInfo.permalinkPath"
      :class="$options.buttonClassList"
      class="js-data-file-blob-permalink-url"
    >
      {{ $options.i18n.permalink }}
    </gl-button>

    <web-ide-link
      v-if="glFeatures.blobOverflowMenu && showWebIdeLink"
      :show-edit-button="!isBinaryFileType"
      class="!gl-m-0"
      :edit-url="blobInfo.editBlobPath"
      :web-ide-url="blobInfo.ideEditPath"
      :needs-to-fork="shouldShowSingleFileEditorForkSuggestion"
      :needs-to-fork-with-web-ide="shouldShowWebIdeForkSuggestion"
      :show-pipeline-editor-button="Boolean(blobInfo.pipelineEditorPath)"
      :pipeline-editor-url="blobInfo.pipelineEditorPath"
      :gitpod-url="blobInfo.gitpodBlobUrl"
      :is-gitpod-enabled-for-instance="gitpodEnabled"
      :is-gitpod-enabled-for-user="currentUser && currentUser.gitpodEnabled"
      :project-path="projectPath"
      :project-id="projectIdAsNumber"
      :user-preferences-gitpod-path="currentUser && currentUser.preferencesGitpodPath"
      :user-profile-enable-gitpod-path="currentUser && currentUser.profileEnableGitpodPath"
      is-blob
      disable-fork-modal
      :disabled="isUsingLfs"
      @edit="onEdit"
    />
    <fork-suggestion-modal
      v-if="!isLoadingRepositoryBlob"
      :visible="isForkSuggestionModalVisible"
      :fork-path="blobInfo.forkAndViewPath"
      @hide="isForkSuggestionModalVisible = false"
    />

    <gl-loading-icon
      v-if="isLoadingRepositoryBlob"
      :label="__('Loading file actions')"
      class="gl-p-3"
      size="sm"
      color="dark"
      variant="spinner"
      :inline="false"
    />
    <blob-overflow-menu
      v-if="!isLoadingRepositoryBlob && glFeatures.blobOverflowMenu"
      :project-path="projectPath"
      :is-binary-file-type="isBinaryFileType"
      :override-copy="true"
      :is-empty-repository="project.repository.empty"
      :is-using-lfs="isUsingLfs"
      @copy="onCopy"
      @showForkSuggestion="onShowForkSuggestion"
      @lockedFile="onLockedFile"
    />
  </div>
</template>
