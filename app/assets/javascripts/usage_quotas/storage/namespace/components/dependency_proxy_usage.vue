<script>
import UsageBanner from '~/vue_shared/components/usage_quotas/usage_banner.vue';
import { s__ } from '~/locale';
import NumberToHumanSize from '~/vue_shared/components/number_to_human_size/number_to_human_size.vue';
import HelpPageLink from '~/vue_shared/components/help_page_link/help_page_link.vue';

export default {
  name: 'DependencyProxyUsage',
  components: {
    NumberToHumanSize,
    HelpPageLink,
    UsageBanner,
  },
  props: {
    dependencyProxyTotalSize: {
      type: Number,
      required: false,
      default: 0,
    },
    loading: {
      type: Boolean,
      required: false,
      default: false,
    },
    description: {
      type: String,
      required: false,
      default: s__('UsageQuota|Local proxy used for frequently-accessed upstream Docker images.'),
    },
  },
  i18n: {
    dependencyProxy: s__('UsageQuota|Dependency proxy'),
    storageUsed: s__('UsageQuota|Storage used'),
  },
};
</script>
<template>
  <usage-banner :loading="loading">
    <template #left-primary-text>
      {{ $options.i18n.dependencyProxy }}
    </template>
    <template #left-secondary-text>
      <div data-testid="dependency-proxy-description">
        {{ description }}
        <help-page-link href="user/packages/dependency_proxy/_index">
          {{ __('More information') }}
        </help-page-link>
      </div>
    </template>
    <template #right-primary-text>
      {{ $options.i18n.storageUsed }}
    </template>
    <template #right-secondary-text>
      <number-to-human-size
        :value="dependencyProxyTotalSize"
        data-testid="dependency-proxy-size-content"
      />
    </template>
  </usage-banner>
</template>
