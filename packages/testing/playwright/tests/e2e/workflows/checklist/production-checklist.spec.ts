import { test, expect } from '../../../../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe(
	'Workflow Production Checklist',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should show suggested actions automatically when workflow is first published', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();

			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistButton()).toBeVisible();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(n8n.canvas.getErrorActionItem()).toBeVisible();
			await expect(n8n.canvas.getTimeSavedActionItem()).toBeVisible();
		});

		test('should display evaluations action when AI node exists and feature is enabled', async ({
			n8n,
		}) => {
			await n8n.api.enableFeature('evaluation');

			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode('OpenAI', { action: 'Message a model', closeNDV: true });

			await n8n.canvas.nodeDisableButton('Message a model').click();

			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getEvaluationsActionItem()).toBeVisible();
			await n8n.canvas.getEvaluationsActionItem().click();

			await expect(n8n.page).toHaveURL(/\/evaluation/);
		});

		test('should open workflow settings modal when error workflow action is clicked', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();
			await errorAction.click();

			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
			await expect(n8n.page.getByTestId('workflow-settings-error-workflow')).toBeVisible();
		});

		test('should open workflow settings modal when time saved action is clicked', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const timeAction = n8n.canvas.getTimeSavedActionItem();
			await expect(timeAction).toBeVisible();
			await timeAction.click();

			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
		});

		test('should allow ignoring individual actions', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getProductionChecklistActionItem().first()).toContainText('error');
			await n8n.canvas.getProductionChecklistActionItem().first().getByTitle('Ignore').click();
			await expect(n8n.canvas.getErrorActionItem()).toBeHidden();

			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await n8n.canvas.clickProductionChecklistButton();

			await expect(n8n.canvas.getErrorActionItem()).toBeHidden();
			await expect(n8n.canvas.getTimeSavedActionItem()).toBeVisible();
		});

		// Flaky in multi-main mode
		test.fixme('should show completed state for configured actions', async ({ n8n, api }) => {
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler',
				nodes: [
					{
						id: 'error-trigger',
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {},
				active: false,
			});
			await api.workflows.activate(errorWorkflow.id, errorWorkflow.versionId);

			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(
				n8n.canvas
					.getProductionChecklistActionItem()
					.first()
					.locator('svg[data-icon="circle-check"]'),
			).toBeVisible();
		});

		test('should allow ignoring all actions with confirmation', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await n8n.canvas.clickProductionChecklistIgnoreAll();

			await expect(n8n.page.locator('.el-message-box')).toBeVisible();
			await n8n.page
				.locator('.el-message-box__btns button')
				.filter({ hasText: /ignore for all workflows/i })
				.click();

			await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();
		});

		test('should reactively update checklist when error workflow is added - N8N-9862', async ({
			n8n,
			api,
		}) => {
			// Create and activate error workflow
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler',
				nodes: [
					{
						id: 'error-trigger',
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {},
				active: false,
			});
			await api.workflows.activate(errorWorkflow.id, errorWorkflow.versionId);

			// Create and publish main workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify checklist is visible with error workflow action
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();

			// Verify initial count shows incomplete (e.g., "0/2" or "0/3")
			const checklistButton = n8n.canvas.getProductionChecklistButton();
			const initialCount = await checklistButton.textContent();
			expect(initialCount).toMatch(/^0\/\d+$/);

			// Add error workflow via settings modal
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// BUG REPRODUCTION: After saving, the checklist should update reactively
			// Expected: count updates to "1/2" or "1/3" and error workflow shows as completed
			// Actual: count stays at "0/2" or "0/3" until page refresh

			// Verify count updated
			const updatedCount = await checklistButton.textContent();
			expect(updatedCount).toMatch(/^1\/\d+$/);

			// Verify error workflow action shows as completed
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const completedIcon = n8n.canvas
				.getProductionChecklistActionItem()
				.filter({ hasText: /error/i })
				.locator('svg[data-icon="circle-check"]');
			await expect(completedIcon).toBeVisible();
		});

		test('should reactively remove error workflow from checklist when added - N8N-9862', async ({
			n8n,
			api,
		}) => {
			// Create and activate error workflow
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler',
				nodes: [
					{
						id: 'error-trigger',
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {},
				active: false,
			});
			await api.workflows.activate(errorWorkflow.id, errorWorkflow.versionId);

			// Create and publish main workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify checklist is visible with error workflow action
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(n8n.canvas.getErrorActionItem()).toBeVisible();

			// Count total actions before adding error workflow
			const initialActionCount = await n8n.canvas.getProductionChecklistActionItem().count();

			// Add error workflow via settings modal
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// BUG REPRODUCTION: Error workflow action should be removed from checklist
			// Expected: Error workflow item is removed or marked complete
			// Actual: Error workflow item still appears as incomplete

			// Re-open checklist to verify state
			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// Verify error workflow action is either removed or marked as complete
			const errorActionAfter = n8n.canvas.getErrorActionItem();
			const isHidden = !(await errorActionAfter.isVisible().catch(() => false));
			const hasCompletedIcon = await errorActionAfter
				.locator('svg[data-icon="circle-check"]')
				.isVisible()
				.catch(() => false);

			// Should be either hidden or show completed state
			expect(isHidden || hasCompletedIcon).toBe(true);
		});
	},
);
