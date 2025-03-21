import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { GlDisclosureDropdown } from '@gitlab/ui';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { isLoggedIn } from '~/lib/utils/common_utils';
import { createAlert } from '~/alert';
import projectInfoQuery from 'ee_else_ce/repository/queries/project_info.query.graphql';
import BlobOverflowMenu from '~/repository/components/header_area/blob_overflow_menu.vue';
import BlobDefaultActionsGroup from '~/repository/components/header_area/blob_default_actions_group.vue';
import PermalinkDropdownItem from '~/repository/components/header_area/permalink_dropdown_item.vue';
import BlobButtonGroup from '~/repository/components/header_area/blob_button_group.vue';
import BlobDeleteFileGroup from '~/repository/components/header_area/blob_delete_file_group.vue';
import createRouter from '~/repository/router';
import { projectMock, blobControlsDataMock, refMock } from 'ee_else_ce_jest/repository/mock_data';

Vue.use(VueApollo);
jest.mock('~/alert');
jest.mock('~/lib/utils/common_utils', () => ({
  isLoggedIn: jest.fn().mockReturnValue(true),
}));

describe('Blob Overflow Menu', () => {
  let wrapper;
  let fakeApollo;

  const projectPath = '/some/project';
  const router = createRouter(projectPath, refMock);

  router.replace({ name: 'blobPath', params: { path: '/some/file.js' } });

  const projectInfoQuerySuccessResolver = jest
    .fn()
    .mockResolvedValue({ data: { project: projectMock } });
  const projectInfoQueryErrorResolver = jest.fn().mockRejectedValue(new Error('Request failed'));

  const createComponent = async ({
    propsData = {},
    projectInfoResolver = projectInfoQuerySuccessResolver,
    provided = {},
  } = {}) => {
    fakeApollo = createMockApollo([[projectInfoQuery, projectInfoResolver]]);

    wrapper = shallowMountExtended(BlobOverflowMenu, {
      router,
      apolloProvider: fakeApollo,
      provide: {
        blobInfo: blobControlsDataMock.repository.blobs.nodes[0],
        currentRef: refMock,
        ...provided,
      },
      propsData: {
        projectPath,
        userPermissions: blobControlsDataMock.userPermissions,
        ...propsData,
      },
      stub: {
        GlDisclosureDropdown,
      },
    });
    await waitForPromises();
  };

  const findBlobActionsDropdown = () => wrapper.findComponent(GlDisclosureDropdown);
  const findBlobDefaultActionsGroup = () => wrapper.findComponent(BlobDefaultActionsGroup);
  const findBlobButtonGroup = () => wrapper.findComponent(BlobButtonGroup);
  const findPermalinkDropdownItem = () => wrapper.findComponent(PermalinkDropdownItem);
  const findBlobDeleteFileGroup = () => wrapper.findComponent(BlobDeleteFileGroup);

  beforeEach(async () => {
    createAlert.mockClear();
    await createComponent();
  });

  afterEach(() => {
    fakeApollo = null;
  });

  it('renders blob actions dropdown', () => {
    expect(findBlobActionsDropdown().exists()).toBe(true);
    expect(findBlobActionsDropdown().props('toggleText')).toBe('File actions');
  });

  it('creates an alert with the correct message, when projectInfo query fails', async () => {
    await createComponent({ projectInfoResolver: projectInfoQueryErrorResolver });

    expect(createAlert).toHaveBeenCalledWith({
      message: 'An error occurred while fetching lock information, please try again.',
    });
  });

  describe('Default blob actions', () => {
    it('renders BlobDefaultActionsGroup component', () => {
      expect(findBlobDefaultActionsGroup().exists()).toBe(true);
    });

    describe('events', () => {
      it('proxy copy event when overrideCopy is true', () => {
        createComponent({
          propsData: {
            overrideCopy: true,
          },
        });

        findBlobDefaultActionsGroup().vm.$emit('copy');
        expect(wrapper.emitted('copy')).toHaveLength(1);
      });

      it('does not proxy copy event when overrideCopy is false', () => {
        createComponent({
          propsData: {
            overrideCopy: false,
          },
        });

        findBlobDefaultActionsGroup().vm.$emit('copy');
        expect(wrapper.emitted('copy')).toBeUndefined();
      });
    });
  });

  describe('Blob Button Group', () => {
    it('renders component', () => {
      expect(findBlobButtonGroup().exists()).toBe(true);
    });

    it('does not render when blob is archived', () => {
      createComponent({
        provided: {
          blobInfo: {
            ...blobControlsDataMock.repository.blobs.nodes[0],
            archived: true,
          },
        },
      });

      expect(findBlobButtonGroup().exists()).toBe(false);
    });

    it('does not render when user is not logged in', () => {
      isLoggedIn.mockImplementationOnce(() => false);
      createComponent();

      expect(findBlobButtonGroup().exists()).toBe(false);
    });
  });

  describe('Blob Delete File Group', () => {
    it('renders when blob is not archived, and user is logged in', () => {
      expect(findBlobDeleteFileGroup().exists()).toBe(true);
    });

    it('does not render when blob is archived', () => {
      createComponent({
        provided: {
          blobInfo: {
            ...blobControlsDataMock.repository.blobs.nodes[0],
            archived: true,
          },
        },
      });

      expect(findBlobDeleteFileGroup().exists()).toBe(false);
    });

    it('does not render when user is not logged in', () => {
      isLoggedIn.mockImplementationOnce(() => false);
      createComponent();

      expect(findBlobDeleteFileGroup().exists()).toBe(false);
    });
  });

  describe('Permalink Dropdown Item', () => {
    it('renders component', () => {
      expect(findPermalinkDropdownItem().exists()).toBe(true);
    });
  });
});
