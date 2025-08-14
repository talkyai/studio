/*
  UI Placements Demo Plugin
  Demonstrates how to register UI elements for all supported placements and kinds.
*/

export async function init(TalkyAPI) {
  const React = TalkyAPI.React;
  // Toolbar: simple button
  TalkyAPI.registerUI({
    id: 'demo-toolbar-button',
    placement: 'app.toolbar',
    kind: 'button',
    tooltip: 'Demo toolbar button',
    onClick: () => TalkyAPI.showNotification('Toolbar button clicked')
  });

  // Toolbar: dropdown (rendered as a group of buttons in host UI)
  TalkyAPI.registerUI({
    id: 'demo-toolbar-dropdown',
    placement: 'app.toolbar',
    kind: 'dropdown',
    tooltip: 'Demo toolbar dropdown',
    items: [
      {
        id: 'dropdown-item-1',
        label: 'Item 1',
        tooltip: 'First dropdown item',
        onClick: () => TalkyAPI.showNotification('Dropdown item 1 clicked')
      },
      {
        id: 'dropdown-item-2',
        label: 'Item 2',
        tooltip: 'Second dropdown item',
        onClick: () => TalkyAPI.showNotification('Dropdown item 2 clicked')
      }
    ]
  });

  // chat.inputBar: custom component (simple button)
  const InputCustom = () => (
    React.createElement('button', {
      onClick: () => TalkyAPI.showNotification('Input custom clicked'),
      style: { padding: '4px 8px', fontSize: '12px' }
    }, 'Demo Input Button')
  );
  TalkyAPI.registerUI({
    id: 'demo-input-custom',
    placement: 'chat.inputBar',
    kind: 'custom',
    component: InputCustom,
    tooltip: 'Custom element in input bar'
  });

  // chat.underUserMessage: group (uses ctx)
  TalkyAPI.registerUI({
    id: 'demo-under-user-group',
    placement: 'chat.underUserMessage',
    kind: 'group',
    items: [
      {
        id: 'under-user-copy',
        tooltip: 'Alert user message index',
        onClick: (ctx) => TalkyAPI.showNotification(`User message #${ctx?.index} clicked`)
      },
      {
        id: 'under-user-info',
        tooltip: 'Show user message length',
        onClick: (ctx) => TalkyAPI.showNotification(`User text length: ${ctx?.message?.text?.length ?? 0}`)
      }
    ]
  });

  // chat.underAIMessage: button (uses ctx)
  TalkyAPI.registerUI({
    id: 'demo-under-ai-button',
    placement: 'chat.underAIMessage',
    kind: 'button',
    tooltip: 'Button under AI message',
    onClick: (ctx) => TalkyAPI.showNotification(`AI message #${ctx?.index} button clicked`)
  });

  // chat.aboveLocalModelStatus: custom component
  const AboveStatusCustom = () => (
    React.createElement('span', { style: { fontSize: '12px', color: '#666' } }, 'Demo: above local model status')
  );
  TalkyAPI.registerUI({
    id: 'demo-above-status-custom',
    placement: 'chat.aboveLocalModelStatus',
    kind: 'custom',
    component: AboveStatusCustom
  });

  // settings.panel: form and button
  const SettingsForm = () => {
    const [value, setValue] = React.useState('');
    return React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
      React.createElement('input', {
        placeholder: 'Demo setting',
        value,
        onChange: (e) => setValue(e.target.value),
        style: { padding: '4px', fontSize: '12px' }
      }),
      React.createElement('button', {
        onClick: () => TalkyAPI.showNotification(`Saved demo setting: ${value || '(empty)'}`),
        style: { padding: '4px 8px', fontSize: '12px' }
      }, 'Save')
    );
  };
  TalkyAPI.registerUI({
    id: 'demo-settings-form',
    placement: 'settings.panel',
    kind: 'form',
    component: SettingsForm
  });

  TalkyAPI.registerUI({
    id: 'demo-settings-button',
    placement: 'settings.panel',
    kind: 'button',
    tooltip: 'Settings demo button',
    onClick: () => TalkyAPI.showNotification('Settings button clicked')
  });
}
