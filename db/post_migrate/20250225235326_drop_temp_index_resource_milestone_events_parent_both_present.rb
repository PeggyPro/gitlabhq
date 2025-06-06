# frozen_string_literal: true

class DropTempIndexResourceMilestoneEventsParentBothPresent < Gitlab::Database::Migration[2.2]
  INDEX_NAME = 'tmp_idx_resource_milestone_events_issue_mr_both_present'

  disable_ddl_transaction!
  milestone '17.10'

  def up
    remove_concurrent_index :resource_milestone_events, :id, name: INDEX_NAME
  end

  def down
    add_concurrent_index :resource_milestone_events,
      :id,
      name: INDEX_NAME,
      where: 'issue_id IS NOT NULL AND merge_request_id IS NOT NULL'
  end
end
