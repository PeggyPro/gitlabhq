import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { createAlert } from '~/alert';

import CrudComponent from '~/vue_shared/components/crud_component.vue';
import InputsTableSkeletonLoader from '~/ci/common/pipeline_inputs/pipeline_inputs_table/inputs_table_skeleton_loader.vue';
import PipelineInputsForm from '~/ci/common/pipeline_inputs/pipeline_inputs_form.vue';
import PipelineInputsTable from '~/ci/common/pipeline_inputs/pipeline_inputs_table/pipeline_inputs_table.vue';
import getPipelineInputsQuery from '~/ci/common/pipeline_inputs/graphql/queries/pipeline_creation_inputs.query.graphql';
/** mock data to be replaced with fixtures - https://gitlab.com/gitlab-org/gitlab/-/issues/525243 */
import {
  mockPipelineInputsResponse,
  mockEmptyInputsResponse,
  mockPipelineInputsErrorResponse,
} from './mock_data';

Vue.use(VueApollo);
jest.mock('~/alert');

const defaultProps = {
  queryRef: 'main',
};
const defaultProvide = {
  projectPath: '/root/project',
};

describe('PipelineInputsForm', () => {
  let wrapper;
  let pipelineInputsHandler;

  const createComponent = async ({ props = {}, provide = {} } = {}) => {
    const handlers = [[getPipelineInputsQuery, pipelineInputsHandler]];
    const mockApollo = createMockApollo(handlers);
    wrapper = shallowMountExtended(PipelineInputsForm, {
      propsData: {
        ...defaultProps,
        ...props,
      },
      provide: {
        ...defaultProvide,
        ...provide,
      },
      apolloProvider: mockApollo,
    });
    await waitForPromises();
  };

  const findSkeletonLoader = () => wrapper.findComponent(InputsTableSkeletonLoader);
  const findInputsTable = () => wrapper.findComponent(PipelineInputsTable);
  const findCrudComponent = () => wrapper.findComponent(CrudComponent);
  const findEmptyState = () => wrapper.findByText('There are no inputs for this configuration.');

  describe('mounted', () => {
    beforeEach(() => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      createComponent();
    });

    it('sets the initial props for crud component', () => {
      expect(findCrudComponent().exists()).toBe(true);
      expect(findCrudComponent().props()).toMatchObject({
        count: 0,
        description: 'Specify the input values to use in this pipeline.',
        icon: 'code',
        title: 'Inputs',
      });
    });

    it('renders a loading state', () => {
      expect(findSkeletonLoader().exists()).toBe(true);
    });
  });

  describe('GraphQL query', () => {
    describe('with inputs', () => {
      beforeEach(async () => {
        pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
        await createComponent();
      });

      it('renders a table when inputs are available', () => {
        expect(findInputsTable().exists()).toBe(true);
      });

      it('sends the correct props to the table', () => {
        const expectedInputs = [
          {
            name: 'deploy_environment',
            description: 'Specify deployment environment',
            default: 'staging',
            type: 'text',
            required: false,
            options: ['staging', 'production'],
            regex: '^(staging|production)$',
          },
          {
            name: 'api_token',
            description: 'API token for deployment',
            default: '',
            type: 'text',
            required: true,
            options: [],
            regex: null,
          },
          {
            name: 'tags',
            description: 'Tags for deployment',
            default: '',
            type: 'ARRAY',
            required: false,
            options: [],
            regex: null,
          },
        ];
        expect(findInputsTable().props('inputs')).toEqual(expectedInputs);
      });

      it('updates the count in the crud component', () => {
        expect(findCrudComponent().props('count')).toBe(3);
      });
    });

    describe('with no inputs', () => {
      beforeEach(async () => {
        pipelineInputsHandler = jest.fn().mockResolvedValue(mockEmptyInputsResponse);
        await createComponent();
      });

      it('does not render a table when there are no inputs', () => {
        expect(findInputsTable().exists()).toBe(false);
      });

      it('displays the empty state message when there are no inputs', () => {
        expect(findEmptyState().exists()).toBe(true);
      });
    });

    describe('with empty ref (error case)', () => {
      it('handles GraphQL error', async () => {
        pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsErrorResponse);
        await createComponent();

        expect(createAlert).toHaveBeenCalledWith({
          message: 'ref can only be an existing branch or tag',
        });
      });

      it('handles generic error', async () => {
        pipelineInputsHandler = jest.fn().mockRejectedValue('Error');
        await createComponent();

        expect(createAlert).toHaveBeenCalledWith({
          message: 'There was a problem fetching the pipeline inputs. Please try again.',
        });
      });
    });

    describe('when projectPath is not provided', () => {
      beforeEach(async () => {
        pipelineInputsHandler = jest.fn();
        await createComponent({ provide: { projectPath: '' } });
      });

      it('does not execute the query', () => {
        expect(pipelineInputsHandler).not.toHaveBeenCalled();
        expect(findEmptyState().exists()).toBe(true);
      });
    });
  });

  describe('savedInputs prop', () => {
    it('overwrites default values if saved input values are provided', async () => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      const savedInputs = [{ name: 'deploy_environment', value: 'saved-value' }];
      await createComponent({ props: { savedInputs } });

      const updatedInput = findInputsTable()
        .props('inputs')
        .find((i) => i.name === 'deploy_environment');
      expect(updatedInput.default).toBe('saved-value');
    });
  });

  describe('event handling', () => {
    it('processes and emits update events from the table component', async () => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      await createComponent();

      const updatedInput = { ...wrapper.vm.inputs[0], value: 'updated-value' };
      findInputsTable().vm.$emit('update', updatedInput);

      expect(wrapper.vm.inputs.find((input) => input.name === updatedInput.name).value).toBe(
        'updated-value',
      );
      expect(wrapper.emitted()['update-inputs']).toHaveLength(1);

      const expectedEmittedValue = wrapper.vm.inputs.map((input) => ({
        name: input.name,
        value: input.default,
      }));
      expect(wrapper.emitted()['update-inputs'][0][0]).toEqual(expectedEmittedValue);
    });

    it('only emits modified inputs when emitModifiedOnly is true', async () => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      await createComponent({ props: { emitModifiedOnly: true } });

      const inputs = findInputsTable().props('inputs');
      const totalInputsCount = inputs.length;
      const inputToModify = { ...inputs[0], default: 'modified-value' };

      findInputsTable().vm.$emit('update', inputToModify);

      const emittedNameValuePairs = wrapper.emitted()['update-inputs'][0][0];

      expect(emittedNameValuePairs).toHaveLength(1);
      expect(emittedNameValuePairs.length).toBeLessThan(totalInputsCount);
    });

    it('converts string values to arrays for ARRAY type inputs', async () => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      await createComponent();

      // Get the array input from the current inputs prop of the table
      const inputs = findInputsTable().props('inputs');
      const arrayInput = inputs.find((input) => input.type === 'ARRAY');

      const updatedInput = {
        ...arrayInput,
        default: '[1,2,3]',
      };

      findInputsTable().vm.$emit('update', updatedInput);

      // Check that the emitted value contains the converted array
      const emittedValues = wrapper.emitted()['update-inputs'][0][0];
      const emittedArrayValue = emittedValues.find((item) => item.name === 'tags').value;

      expect(Array.isArray(emittedArrayValue)).toBe(true);
      expect(emittedArrayValue).toEqual([1, 2, 3]);
    });

    it('converts complex object arrays correctly', async () => {
      pipelineInputsHandler = jest.fn().mockResolvedValue(mockPipelineInputsResponse);
      await createComponent();

      const inputs = findInputsTable().props('inputs');
      const arrayInput = inputs.find((input) => input.type === 'ARRAY');

      const updatedInput = {
        ...arrayInput,
        default: '[{"key": "value"}, {"another": "object"}]',
      };

      findInputsTable().vm.$emit('update', updatedInput);

      const emittedValues = wrapper.emitted()['update-inputs'][0][0];
      const emittedArrayValue = emittedValues.find((item) => item.name === 'tags').value;

      expect(Array.isArray(emittedArrayValue)).toBe(true);
      expect(emittedArrayValue).toEqual([{ key: 'value' }, { another: 'object' }]);
    });
  });
});
