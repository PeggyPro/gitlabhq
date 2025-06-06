import { GlCollapsibleListbox } from '@gitlab/ui';
import { shallowMount } from '@vue/test-utils';
import Dropdown from '~/confidential_merge_request/components/dropdown.vue';

const TEST_PROJECTS = [
  {
    id: 7,
    pathWithNamespace: 'group/test-fork',
  },
  {
    id: 9,
    pathWithNamespace: 'group2/test-fork',
  },
  {
    id: 11,
    pathWithNamespace: 'group3/test-fork',
  },
];

describe('~/confidential_merge_request/components/dropdown.vue', () => {
  let wrapper;

  function factory(props = {}) {
    wrapper = shallowMount(Dropdown, {
      propsData: {
        projects: TEST_PROJECTS,
        ...props,
      },
    });
  }

  const findListbox = () => wrapper.findComponent(GlCollapsibleListbox);

  describe('default', () => {
    beforeEach(() => {
      factory();
    });

    it('renders collapsible listbox', () => {
      expect(findListbox().props()).toMatchObject({
        icon: 'lock',
        selected: [],
        toggleText: 'Select private project',
        block: true,
        items: TEST_PROJECTS.map(({ id, pathWithNamespace }) => ({
          value: String(id),
          text: pathWithNamespace,
        })),
      });
    });

    it('does not emit anything', () => {
      expect(wrapper.emitted()).toEqual({});
    });

    describe('when listbox emits selected', () => {
      beforeEach(() => {
        findListbox().vm.$emit('select', String(TEST_PROJECTS[1].id));
      });

      it('emits selected project', () => {
        expect(wrapper.emitted('select')).toEqual([[TEST_PROJECTS[1]]]);
      });
    });
  });

  describe('with selected', () => {
    beforeEach(() => {
      factory({ selectedProject: TEST_PROJECTS[1] });
    });

    it('shows selected project', () => {
      expect(findListbox().props()).toMatchObject({
        selected: String(TEST_PROJECTS[1].id),
        toggleText: TEST_PROJECTS[1].pathWithNamespace,
      });
    });
  });
});
