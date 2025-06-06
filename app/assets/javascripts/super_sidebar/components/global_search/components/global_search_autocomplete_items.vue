<script>
import {
  GlAvatar,
  GlAlert,
  GlLoadingIcon,
  GlDisclosureDropdownGroup,
  GlDisclosureDropdownItem,
} from '@gitlab/ui';
// eslint-disable-next-line no-restricted-imports
import { mapState, mapGetters } from 'vuex';
import { s__ } from '~/locale';
import { InternalEvents } from '~/tracking';
import SafeHtml from '~/vue_shared/directives/safe_html';
import highlight from '~/lib/utils/highlight';
import { AVATAR_SHAPE_OPTION_RECT, AVATAR_SHAPE_OPTION_CIRCLE } from '~/vue_shared/constants';
import {
  AUTOCOMPLETE_ERROR_MESSAGE,
  NO_SEARCH_RESULTS,
} from '~/vue_shared/global_search/constants';
import {
  EVENT_CLICK_PROJECT_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_GROUP_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_MERGE_REQUEST_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_ISSUE_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_RECENT_ISSUE_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_RECENT_EPIC_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_RECENT_MERGE_REQUEST_RESULT_IN_COMMAND_PALETTE,
  EVENT_CLICK_USER_RESULT_IN_COMMAND_PALETTE,
} from '~/super_sidebar/components/global_search/tracking_constants';
import {
  OVERLAY_GOTO,
  OVERLAY_PROFILE,
  OVERLAY_PROJECT,
  OVERLAY_FILE,
  USERS_GROUP_TITLE,
  PROJECTS_GROUP_TITLE,
  ISSUES_GROUP_TITLE,
  PAGES_GROUP_TITLE,
  GROUPS_GROUP_TITLE,
  GROUPS_GROUP_HANDLE,
  PROJECTS_GROUP_HANDLE,
} from '../command_palette/constants';
import SearchResultFocusLayover from './global_search_focus_overlay.vue';
import GlobalSearchNoResults from './global_search_no_results.vue';

const trackingMixin = InternalEvents.mixin();

export default {
  name: 'GlobalSearchAutocompleteItems',
  i18n: {
    AUTOCOMPLETE_ERROR_MESSAGE,
    NO_SEARCH_RESULTS,
    OVERLAY_GOTO,
    OVERLAY_PROFILE,
    OVERLAY_PROJECT,
    OVERLAY_FILE,
    USERS_GROUP_TITLE,
    PROJECTS_GROUP_TITLE,
    ISSUES_GROUP_TITLE,
    PAGES_GROUP_TITLE,
    GROUPS_GROUP_TITLE,
    MERGE_REQUESTS_GROUP_TITLE: s__('GlobalSearch|Merge requests'),
    RECENT_ISSUES_GROUP_TITLE: s__('GlobalSearch|Recent issues'),
    RECENT_EPICS_GROUP_TITLE: s__('GlobalSearch|Recent epics'),
    RECENT_MERGE_REQUESTS_GROUP_TITLE: s__('GlobalSearch|Recent merge requests'),
  },
  components: {
    GlAvatar,
    GlAlert,
    GlLoadingIcon,
    GlDisclosureDropdownGroup,
    GlDisclosureDropdownItem,
    SearchResultFocusLayover,
    GlobalSearchNoResults,
  },
  directives: {
    SafeHtml,
  },
  AVATAR_SHAPE_OPTION_RECT,
  AVATAR_SHAPE_OPTION_CIRCLE,
  mixins: [trackingMixin],
  computed: {
    ...mapState(['search', 'loading', 'autocompleteError']),
    ...mapGetters(['autocompleteGroupedSearchOptions']),
    groups() {
      return this.autocompleteGroupedSearchOptions.map((group) => {
        return {
          name: this.modifiedGroupName(group?.name),
          items: group?.items?.map((item) => {
            return {
              ...item,
              extraAttrs: {
                class: 'show-focus-layover gl-flex gl-items-center gl-justify-between',
              },
            };
          }),
        };
      });
    },
    hasResults() {
      return this.autocompleteGroupedSearchOptions?.length > 0;
    },
    hasNoResults() {
      return !this.hasResults && !this.autocompleteError;
    },
  },
  methods: {
    highlightedName(val) {
      return highlight(val, this.search);
    },
    overlayText(group) {
      let text = OVERLAY_GOTO;

      switch (group) {
        case this.$options.i18n.USERS_GROUP_TITLE:
          text = this.$options.i18n.OVERLAY_PROFILE;
          break;
        case this.$options.i18n.PROJECTS_GROUP_TITLE:
          text = this.$options.i18n.OVERLAY_PROJECT;
          break;
        case this.$options.i18n.ISSUES_GROUP_TITLE:
          text = this.$options.i18n.OVERLAY_GOTO;
          break;
        case this.$options.i18n.PAGES_GROUP_TITLE:
          text = this.$options.i18n.OVERLAY_FILE;
          break;
        default:
      }
      return text;
    },
    trackingTypes({ name }) {
      switch (name) {
        case this.$options.i18n.PROJECTS_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_PROJECT_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.GROUPS_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_GROUP_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.MERGE_REQUESTS_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_MERGE_REQUEST_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.ISSUES_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_ISSUE_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.RECENT_ISSUES_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_RECENT_ISSUE_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.RECENT_EPICS_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_RECENT_EPIC_RESULT_IN_COMMAND_PALETTE);
          break;
        }
        case this.$options.i18n.RECENT_MERGE_REQUESTS_GROUP_TITLE: {
          this.trackEvent(EVENT_CLICK_RECENT_MERGE_REQUEST_RESULT_IN_COMMAND_PALETTE);
          break;
        }

        default: {
          this.trackEvent(EVENT_CLICK_USER_RESULT_IN_COMMAND_PALETTE);
        }
      }
    },
    modifiedGroupName(groupName) {
      if (groupName === GROUPS_GROUP_HANDLE) {
        return this.$options.i18n.GROUPS_GROUP_TITLE;
      }

      if (groupName === PROJECTS_GROUP_HANDLE) {
        return this.$options.i18n.PROJECTS_GROUP_TITLE;
      }

      return groupName;
    },
  },
};
</script>

<template>
  <div>
    <gl-alert
      v-if="autocompleteError"
      class="gl-mt-2 gl-text-default"
      :dismissible="false"
      variant="danger"
    >
      {{ $options.i18n.AUTOCOMPLETE_ERROR_MESSAGE }}
    </gl-alert>

    <ul v-if="!loading && hasResults" class="gl-m-0 gl-list-none gl-p-0">
      <gl-disclosure-dropdown-group
        v-for="(group, index) in groups"
        :key="group.name"
        :class="{ '!gl-mt-0': index === 0 }"
        :group="group"
        bordered
        @action="trackingTypes"
      >
        <gl-disclosure-dropdown-item
          v-for="item in group.items"
          :key="item.id || item.text"
          :item="item"
          class="show-on-focus-or-hover--context show-focus-layover gl-flex gl-items-center gl-justify-between"
        >
          <template #list-item>
            <search-result-focus-layover :text-message="overlayText(group)">
              <gl-avatar
                v-if="item.avatar_url !== undefined"
                :src="item.avatar_url"
                :entity-id="item.entity_id"
                :entity-name="item.entity_name"
                :size="16"
                :shape="
                  group.name === $options.i18n.USERS_GROUP_TITLE
                    ? $options.AVATAR_SHAPE_OPTION_CIRCLE
                    : $options.AVATAR_SHAPE_OPTION_RECT
                "
                aria-hidden="true"
              />
              <span class="gl-flex gl-flex-row gl-items-center gl-gap-2 gl-truncate">
                <span
                  v-safe-html="highlightedName(item.text)"
                  class="gl-truncate gl-text-strong"
                  data-testid="autocomplete-item-name"
                ></span>
                <span v-if="item.avatar_url !== undefined" class="gl-text-subtle" aria-hidden="true"
                  >·</span
                >
                <span
                  v-if="item.value"
                  v-safe-html="item.namespace"
                  class="gl-truncate gl-text-sm gl-text-subtle"
                  data-testid="autocomplete-item-namespace"
                ></span>
              </span>
            </search-result-focus-layover>
          </template>
        </gl-disclosure-dropdown-item>
      </gl-disclosure-dropdown-group>
    </ul>

    <gl-loading-icon v-if="loading" size="lg" class="gl-my-6" />

    <global-search-no-results v-if="hasNoResults" />
  </div>
</template>
