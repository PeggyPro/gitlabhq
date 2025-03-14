# frozen_string_literal: true

module WebIde
  module Settings
    class DefaultSettings
      # ALL WEB IDE SETTINGS ARE DECLARED HERE.
      # @return [Hash]
      def self.default_settings
        {
          vscode_extension_marketplace: [
            # See https://sourcegraph.com/github.com/microsoft/vscode@6979fb003bfa575848eda2d3966e872a9615427b/-/blob/src/vs/base/common/product.ts?L96
            #     for the original source of settings entries in the VS Code source code.
            # See https://open-vsx.org/swagger-ui/index.html?urls.primaryName=VSCode%20Adapter#
            #     for OpenVSX Swagger API
            {
              service_url: "https://open-vsx.org/vscode/gallery",
              item_url: "https://open-vsx.org/vscode/item",
              resource_url_template: "https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}",
              control_url: "",
              nls_base_url: "",
              publisher_url: ""
            },
            Hash
          ],
          vscode_extension_marketplace_metadata: [
            { enabled: false, disabled_reason: :instance_disabled },
            Hash
          ],
          vscode_extension_marketplace_view_model: [
            { enabled: false, reason: :instance_disabled, help_url: '' },
            Hash
          ]
        }
      end
    end
  end
end
