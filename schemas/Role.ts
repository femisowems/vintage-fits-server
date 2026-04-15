import { relationship, text, checkbox } from '@keystone-next/fields';
import { list } from '@keystone-next/keystone/schema';

// Helper for permissions checkboxes
const permissionFields = {
  canManageProducts: checkbox({
    defaultValue: false,
    label: 'User can Update and delete any product'
  }),
  canSeeOtherUsers: checkbox({
    defaultValue: false,
    label: 'User can query other users'
  }),
  canManageUsers: checkbox({
    defaultValue: false,
    label: 'User can Edit other users'
  }),
  canManageRoles: checkbox({
    defaultValue: false,
    label: 'User can CRUD roles'
  }),
  canManageCart: checkbox({
    defaultValue: false,
    label: 'User can see and manage cart and deliveries'
  }),
  canManageOrders: checkbox({
    defaultValue: false,
    label: 'User can see and manage orders'
  }),
};

export const Role = list({
  access: {
    // Basic catch-all to prevent unauthenticated access if needed
    create: true, // You can refine this using session details later
    read: true,
    update: true,
    delete: true,
  },
  ui: {
    isHidden: (args) => {
      // You can hide the Roles menu from standard users
      return false;
    },
    hideCreate: (args) => false,
    hideDelete: (args) => false,
    listView: {
      initialColumns: ['name', 'assignedTo'],
    },
  },
  fields: {
    name: text({ isRequired: true }),
    ...permissionFields,
    assignedTo: relationship({
      ref: 'User.role',
      many: true,
      ui: {
        itemView: { fieldMode: 'read' },
      },
    }),
  },
});
