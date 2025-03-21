# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'Admin searches application settings', :js, feature_category: :global_search do
  let_it_be(:admin) { create(:admin) }
  let_it_be(:application_settings) { create(:application_setting) }

  before do
    sign_in(admin)
    enable_admin_mode!(admin)
  end

  context 'in appearances page' do
    before do
      visit(admin_application_settings_appearances_path)
    end

    it_behaves_like 'cannot search settings'
  end

  context 'in ci/cd settings page' do
    before do
      visit(ci_cd_admin_application_settings_path)
    end

    it_behaves_like 'can search settings', 'Variables', 'Package registry'
  end
end
