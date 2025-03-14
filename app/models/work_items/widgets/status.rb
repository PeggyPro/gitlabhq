# frozen_string_literal: true

module WorkItems
  module Widgets
    class Status < Base
      # TODO - remove this once the widget table is implementeed
      # https://gitlab.com/gitlab-org/gitlab/-/issues/498393
      include GlobalID::Identification

      # TODO - remove this once the widget table is implementeed
      # All the below fields gets delegated to the model https://gitlab.com/gitlab-org/gitlab/-/issues/498393
      def id
        '10'
      end

      def name
        'Status'
      end

      def icon_name
        'status icon'
      end
    end
  end
end
