import { NavItem } from './sidenav.model';
import { ROUTES } from '../../core/routing/routes';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Components',
    value: 'components',
    icon: 'toggle_on',
    children: [
      {
        label: 'Buttons',
        value: 'buttons',
        route: ROUTES.components.buttons,
      },
      {
        label: 'Notifications',
        value: 'notifications',
        route: ROUTES.components.notifications,
      },
      {
        label: 'Lozenges',
        value: 'lozenges',
        route: ROUTES.components.lozenges,
      },
      {
        label: 'Kitchen Sink',
        value: 'kitchen-sink',
        children: [
          {
            label: 'Form controls',
            value: 'ks-form-controls',
            route: ROUTES.components.kitchenSink.formControls,
          },
          {
            label: 'Selection controls',
            value: 'ks-selection-controls',
            route: ROUTES.components.kitchenSink.selectionControls,
          },
          {
            label: 'Pickers',
            value: 'ks-pickers',
            route: ROUTES.components.kitchenSink.pickers,
          },
          {
            label: 'Cards & chips',
            value: 'ks-cards-chips',
            route: ROUTES.components.kitchenSink.cardsChips,
          },
          {
            label: 'Layout & navigation',
            value: 'ks-layout-nav',
            route: ROUTES.components.kitchenSink.layoutNav,
          },
          {
            label: 'Overlays',
            value: 'ks-overlays',
            route: ROUTES.components.kitchenSink.overlays,
          },
        ],
      },
    ],
  },
];
