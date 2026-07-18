# VEZvision database boundary

This directory contains only compatibility migrations for the external
VEZvision CMS database. VEZcore-owned modules (calendar, internal files, ACL,
campaign drafts, templates and delivery logs) live in the VEZcore PostgreSQL
database and are provisioned by `postgres/migrations/005_internal_modules.sql`.

The production application reaches VEZvision in one direction through the
authenticated HTTPS administration API. It must never connect directly to the
VEZvision PostgreSQL server.
