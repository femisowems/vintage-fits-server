import { createAuth } from '@keystone-next/auth';
import { config, createSchema, graphQLSchemaExtension } from '@keystone-next/keystone/schema';
import 'dotenv/config';
import {
  withItemData,
  statelessSessions,
} from '@keystone-next/keystone/session';
import { KeystoneConfig } from '@keystone-next/types';
import { User } from './schemas/User';
import { Product } from './schemas/Product';
import { ProductImage } from './schemas/ProductImage';
import { Role } from './schemas/Role';
import { CartItem } from './schemas/CartItem';
import { OrderItem } from './schemas/OrderItem';
import { Order } from './schemas/Order';
import { insertSeedData } from './seed-data';
import { sendPasswordResetEmail } from './lib/mail';
import addToCart from './mutations/addToCart';
import checkout from './mutations/checkout';

const databaseURL =
  process.env.DATABASE_URL || 'mongodb://localhost/keystone-vintage-fits';

const sessionConfig = {
  maxAge: 60 * 60 * 24 * 360, // How long they stay signed in?
  secret: process.env.COOKIE_SECRET,
};

const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  initFirstItem: {
    fields: ['name', 'email', 'password'],
  },
  passwordReset: {
    async sendToken(args) {
      // console.log(args);
      await sendPasswordResetEmail(args.token, args.identity);
    },
  },
});

export default withAuth(
  config({
    server: {
      cors: {
        origin: [process.env.FRONTEND_URL],
        credentials: true,
      },
    },
    db: {
      adapter: 'mongoose',
      url: databaseURL,
      async onConnect(keystone) {
        if (process.argv.includes('--seed-data'))
          await insertSeedData(keystone);
      },
    },
    lists: createSchema({
      // Schema items go in here
      User,
      Product,
      ProductImage,
      CartItem,
      OrderItem,
      Order,
      Role,
    }),
    extendGraphqlSchema: graphQLSchemaExtension({
      typeDefs: `
        type Mutation {
          addToCart(productId: ID): CartItem
          checkout(token: String!): Order
        }
      `,
      resolvers: {
        Mutation: {
          addToCart,
          checkout,
        },
      },
    }),
    ui: {
      isAccessAllowed: ({ session }) => !!session?.data,
    },
    session: withItemData(statelessSessions(sessionConfig), {
      User: `id name email role {
        id 
        name 
        canManageProducts 
        canSeeOtherUsers 
        canManageUsers 
        canManageRoles 
        canManageCart 
        canManageOrders
      }`,
    }),
    // Session is properly configured with roles
  })
);
