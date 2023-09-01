The schema.prisma file is where all the models will be added finally before migration, it happens automatically when the final command is run

The db.prisma contains the connection to the database

Add this connection url to your .env file

<!-- DATABASE_URL="postgresql://username:password@host:port/databasename?schema=public" -->

All models should be created in the schemas folder

to sync with the schema.prisma file and migrate run

npm run schema
or
yarn schema

The migrations folder will contain all migrations made