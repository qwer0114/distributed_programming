import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import betterSqlite3SessionStore from 'better-sqlite3-session-store';
import Database from 'better-sqlite3';
import session from 'express-session';
import passport from 'passport';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const SqliteStore = betterSqlite3SessionStore(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'change-me-in-production',
      resave: false,
      saveUninitialized: false,
      store: new SqliteStore({
        client: new Database(process.env.SESSION_DB_PATH ?? 'sessions.db'),
        expired: { clear: true, intervalMs: 900_000 },
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap().catch(console.error);
