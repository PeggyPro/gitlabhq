<script>
import { GlButton, GlAlert, GlTabs, GlTab, GlLink, GlBanner } from '@gitlab/ui';
import mergeRequestIllustration from '@gitlab/svgs/dist/illustrations/merge-requests-sm.svg';
import Visibility from 'visibilityjs';
import { TYPENAME_USER } from '~/graphql_shared/constants';
import { convertToGraphQLId } from '~/graphql_shared/utils';
import { helpPagePath } from '~/helpers/help_page_helper';
import UserCalloutDismisser from '~/vue_shared/components/user_callout_dismisser.vue';
import eventHub from '../event_hub';
import userMergeRequestUpdatedSubscription from '../queries/user_merge_request_updated.subscription.graphql';
import TabTitle from './tab_title.vue';
import MergeRequestsQuery from './merge_requests_query.vue';
import CollapsibleSection from './collapsible_section.vue';
import MergeRequest from './merge_request.vue';

export default {
  apollo: {
    $subscribe: {
      // eslint-disable-next-line @gitlab/vue-no-undef-apollo-properties
      currentUserUpdated: {
        query: userMergeRequestUpdatedSubscription,
        variables() {
          return {
            userId: this.currentUserId,
          };
        },
        result({ data: { userMergeRequestUpdated: mergeRequest } }) {
          if (!mergeRequest) return;

          const isAssignee = mergeRequest.assignees.nodes.some((u) => u.id === this.currentUserId);
          const isAuthor = mergeRequest.author.id === this.currentUserId;
          const isReviewer = mergeRequest.reviewers.nodes.some((u) => u.id === this.currentUserId);

          if (isAssignee) eventHub.$emit('refetch.mergeRequests', 'assignedMergeRequests');
          if (isAssignee || isAuthor)
            eventHub.$emit('refetch.mergeRequests', 'authorOrAssigneeMergeRequests');
          if (isReviewer) eventHub.$emit('refetch.mergeRequests', 'reviewRequestedMergeRequests');
        },
      },
    },
  },
  components: {
    GlButton,
    GlAlert,
    GlTabs,
    GlTab,
    GlLink,
    GlBanner,
    UserCalloutDismisser,
    TabTitle,
    MergeRequestsQuery,
    CollapsibleSection,
    MergeRequest,
  },
  inject: ['mergeRequestsSearchDashboardPath', 'listTypeToggleEnabled'],
  props: {
    tabs: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      currentTab: this.$route.params.filter || '',
      isVisible: !Visibility.hidden(),
    };
  },
  computed: {
    currentUserId() {
      return convertToGraphQLId(TYPENAME_USER, gon.current_user_id);
    },
  },
  mounted() {
    Visibility.change(() => this.onVisibilityChange());
  },
  methods: {
    onVisibilityChange() {
      this.isVisible = !Visibility.hidden();
    },
    clickTab({ key }) {
      if (this.currentTab === key) return;

      this.currentTab = key;
      this.$router.push({ path: key || '/' });
    },
    queriesForTab(tab) {
      return tab.lists
        .flat()
        .filter((l) => !l.hideCount)
        .map((list) => ({ query: list.query, variables: list.variables }));
    },
  },
  mergeRequestIllustration,
  docsPath: helpPagePath('/tutorials/merge_requests/homepage.html'),
};
</script>

<template>
  <div>
    <user-callout-dismisser feature-name="new_merge_request_dashboard_welcome">
      <template #default="{ shouldShowCallout, dismiss }">
        <gl-banner
          v-if="shouldShowCallout"
          :title="__('New, streamlined merge request homepage!')"
          variant="introduction"
          :button-text="__('See how it works')"
          :button-link="$options.docsPath"
          :svg-path="$options.mergeRequestIllustration"
          @close="dismiss"
        >
          <p>
            {{
              __(
                "Welcome to the new merge request homepage! This page gives you a centralized view of all the merge requests you're working on. Know at a glance what merge requests need your attention first so you can spend less time checking in, and more time reviewing and responding to feedback.",
              )
            }}
          </p>
        </gl-banner>
      </template>
    </user-callout-dismisser>
    <gl-tabs no-key-nav>
      <gl-tab
        v-for="tab in tabs"
        :key="tab.title"
        :active="tab.key === currentTab"
        lazy
        data-testid="merge-request-dashboard-tab"
        @click="clickTab(tab)"
      >
        <template #title>
          <tab-title :title="tab.title" :queries="queriesForTab(tab)" />
        </template>
        <div v-for="(lists, i) in tab.lists" :key="`lists_${i}`">
          <div
            v-if="i === 1"
            class="gl-mb-5 gl-mt-8 gl-rounded-base gl-bg-strong gl-px-4 gl-py-2 gl-font-bold gl-text-subtle"
            data-testid="merge-request-count-explanation"
          >
            {{ __('Items below are excluded from the active count') }}
          </div>
          <merge-requests-query
            v-for="(list, listIndex) in lists"
            :key="`list_${list.id}`"
            :query="list.query"
            :variables="list.variables"
            :hide-count="list.hideCount"
            :is-visible="isVisible"
          >
            <template
              #default="{
                mergeRequests,
                newMergeRequestIds,
                count,
                hasNextPage,
                loadMore,
                loading,
                error,
                resetNewMergeRequestIds,
              }"
            >
              <collapsible-section
                :count="count"
                :has-merge-requests="mergeRequests.length > 0"
                :title="list.title"
                :help-content="list.helpContent"
                :loading="loading"
                :new-merge-request-ids="newMergeRequestIds"
                :merge-requests="mergeRequests"
                :active-list="i === 0"
                :class="{
                  '!gl-mt-0': listIndex === 0,
                  '!gl-mt-3': listIndex > 0,
                }"
                @clear-new="resetNewMergeRequestIds"
              >
                <div>
                  <div class="gl-overflow-x-auto">
                    <table class="gl-w-full">
                      <colgroup>
                        <col style="width: 210px" />
                        <col :style="{ width: '40%', minWidth: '200px' }" />
                        <col style="width: 120px" />
                        <col style="width: 120px" />
                        <col style="width: 220px" />
                      </colgroup>
                      <thead class="gl-border-b gl-bg-subtle">
                        <tr>
                          <th class="gl-pb-3 gl-pl-5 gl-pr-3 gl-text-sm gl-text-subtle">
                            {{ __('Status') }}
                          </th>
                          <th class="gl-px-3 gl-pb-3 gl-text-sm gl-text-subtle">
                            {{ __('Title') }}
                          </th>
                          <th class="gl-px-3 gl-pb-3 gl-text-center gl-text-sm gl-text-subtle">
                            {{ __('Assignee') }}
                          </th>
                          <th class="gl-px-3 gl-pb-3 gl-text-center gl-text-sm gl-text-subtle">
                            {{ __('Reviewers') }}
                          </th>
                          <th
                            class="gl-pb-3 gl-pl-3 gl-pr-5 gl-text-right gl-text-sm gl-text-subtle"
                          >
                            {{ __('Checks') }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <template v-if="mergeRequests.length">
                          <merge-request
                            v-for="(mergeRequest, index) in mergeRequests"
                            :key="mergeRequest.id"
                            :merge-request="mergeRequest"
                            :new-merge-request-ids="newMergeRequestIds"
                            :is-last="index === mergeRequests.length - 1"
                            :list-id="list.id"
                            data-testid="merge-request"
                          />
                        </template>
                        <tr v-else>
                          <td colspan="5" :class="{ 'gl-py-6 gl-text-center': !error }">
                            <template v-if="loading">
                              {{ __('Loading…') }}
                            </template>
                            <template v-else-if="error">
                              <gl-alert variant="danger" :dismissible="false">
                                {{
                                  __(
                                    'There was an error fetching merge requests. Please try again.',
                                  )
                                }}
                              </gl-alert>
                            </template>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <template #pagination>
                  <div
                    v-if="hasNextPage"
                    class="crud-pagination-container gl-flex gl-justify-center"
                  >
                    <gl-button :loading="loading" data-testid="load-more" @click="loadMore">{{
                      __('Show more')
                    }}</gl-button>
                  </div>
                </template>
              </collapsible-section>
            </template>
          </merge-requests-query>
        </div>
      </gl-tab>
      <template #tabs-end>
        <li role="presentation" class="nav-item">
          <gl-link
            :href="mergeRequestsSearchDashboardPath"
            class="nav-link gl-tab-nav-item !gl-no-underline"
          >
            {{ __('Search') }}
          </gl-link>
        </li>
      </template>
    </gl-tabs>
    <div class="gl-mt-6 gl-text-center">
      <gl-link
        :href="
          listTypeToggleEnabled
            ? 'https://gitlab.com/gitlab-org/gitlab/-/issues/542823'
            : 'https://gitlab.com/gitlab-org/gitlab/-/issues/515912'
        "
      >
        {{ __('Leave feedback') }}
      </gl-link>
      <span class="gl-mx-2">|</span>
      <gl-link :href="$options.docsPath">
        {{ __('Documentation') }}
      </gl-link>
    </div>
  </div>
</template>
