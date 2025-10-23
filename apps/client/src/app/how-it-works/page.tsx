import React from 'react'
import Header from '@/components/section/header'
import Footer from '@/components/section/footer'

// Simple anchor component for internal nav
const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="text-2xl font-semibold tracking-tight border-b pb-1">{title}</h2>
    {children}
  </section>
)

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-32 prose prose-invert prose-headings:text-white prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white">
          <h1 className="text-4xl font-bold mb-6">How It Works</h1>
          <p className="lead">
            This document explains the architecture and runtime flow of the 2D Metaverse application: how users
            authenticate, join a space, load maps, move around with collision + trigger logic, and how real‑time state
            is synchronized across clients.
          </p>

          <nav aria-label="Table of contents" className="not-prose mb-10 border rounded-lg p-4 bg-neutral-900/40">
            <ol className="list-decimal list-inside grid sm:grid-cols-2 gap-x-6 text-sm">
              <li><a href="#overview">Overview</a></li>
              <li><a href="#stack">Tech Stack</a></li>
              <li><a href="#modules">Monorepo Modules</a></li>
              <li><a href="#lifecycle">User Lifecycle</a></li>
              <li><a href="#auth">Authentication</a></li>
              <li><a href="#spaces">Spaces & RoomManager</a></li>
              <li><a href="#map-loading">Map Loading</a></li>
              <li><a href="#realtime">Realtime Protocol</a></li>
              <li><a href="#movement">Movement + Collision</a></li>
              <li><a href="#triggers">Triggers / Interactions</a></li>
              <li><a href="#persistence">Persistence</a></li>
              <li><a href="#sequence">End‑to‑End Sequence</a></li>
              <li><a href="#extensibility">Extensibility Ideas</a></li>
            </ol>
          </nav>

          <Section id="overview" title="1. Overview">
            <p>
              The platform is a tile‑based multi‑user environment. A user opens the Next.js client, authenticates to the
              HTTP API, then establishes a WebSocket connection (secured by a JWT stored in a cookie). After joining a
              specific <strong>space</strong>, the server assigns a spawn point derived from Tiled map object layers. The server enforces
              authoritative collision and broadcasts state changes (joins, leaves, movement) to all other players in the
              same space.
            </p>
          </Section>

          <Section id="stack" title="2. Tech Stack">
            <ul>
              <li><strong>Next.js (App Router)</strong> – Frontend UI & SSR.</li>
              <li><strong>Express (apps/http)</strong> – REST endpoints (user & web routes).</li>
              <li><strong>ws (apps/ws)</strong> – WebSocket server for realtime multiplayer.</li>
              <li><strong>Prisma (@repo/db)</strong> – DB access (Spaces, Maps, Participants, Users).</li>
              <li><strong>Redis (@repo/redis)</strong> – (Imported, reserved for ephemeral state / rate limiting / presence).</li>
              <li><strong>Map package (@repo/map)</strong> – Loads raw Tiled JSON (.tmj) map definitions.</li>
              <li><strong>Validation (@repo/valid)</strong> – Shared types (TiledMap, MapObject etc.).</li>
              <li><strong>Turborepo</strong> – Monorepo task orchestration and caching.</li>
              <li><strong>TypeScript + ESLint</strong> – Type safety and code quality.</li>
            </ul>
          </Section>

          <Section id="modules" title="3. Monorepo Modules">
            <p>The repository is organized into cohesive packages/apps:</p>
            <ul>
              <li><code>apps/client</code> – User‑facing Next.js application.</li>
              <li><code>apps/http</code> – Express API serving JSON + auth endpoints.</li>
              <li><code>apps/ws</code> – WebSocket server managing realtime sessions.</li>
              <li><code>packages/db</code> – Prisma schema + client.</li>
              <li><code>packages/map</code> – Map file loader utilities (<code>getMapData</code>).</li>
              <li><code>packages/redis</code> – Redis client abstraction.</li>
              <li><code>packages/validation (@repo/valid)</code> – Shared types & schema utilities.</li>
              <li><code>packages/ui</code> – Reusable UI primitives (buttons, inputs, etc.).</li>
            </ul>
          </Section>

          <Section id="lifecycle" title="4. User Lifecycle (High‑Level)">
            <ol className="list-decimal list-inside">
              <li>User loads client – initial UI + possibly auth redirect.</li>
              <li>User authenticates; server sets a signed JWT cookie (<code>token</code>).</li>
              <li>Client opens WebSocket to <code>apps/ws</code> (browser sends cookies automatically).</li>
              <li>Server validates JWT, constructs a <code>User</code> instance.</li>
              <li>Client sends <code>{`{"type":"join","payload":{"spaceId"}}`}</code>.</li>
              <li>Server initializes space (if first user) via <code>RoomManager.initSpace</code>.</li>
              <li>Server chooses spawn point, returns <code>space-joined</code> payload (self + other players).</li>
              <li>User renders map & avatars; movement inputs emit <code>move</code> messages.</li>
              <li>Server validates movement (collision / triggers) and broadcasts approved state.</li>
              <li>On disconnect, server broadcasts <code>user-left</code>.</li>
            </ol>
          </Section>

          <Section id="auth" title="5. Authentication & Session">
            <p>
              HTTP endpoints handle login and issue a JWT (secret: <code>JWT_SECTRET</code>) stored as a cookie named
              <code>token</code>. The WebSocket upgrade request includes the cookie; the WS server parses and verifies it in
              <code>checkUser()</code>. If invalid, connection closes with a policy status code. Session identity (<code>userId</code>) becomes the
              authoritative key for presence, movement, and broadcast filtering.
            </p>
          </Section>

          <Section id="spaces" title="6. Spaces & RoomManager">
            <p>
              A <em>space</em> represents one logical map + a set of connected users. <code>RoomManager</code> lazily initializes a space the
              first time someone joins: it loads DB metadata (including associated map id) and parses Tiled objects into
              runtime structures (collision rectangles, trigger objects, place objects). Space state cached in memory:
            </p>
            <pre className="text-xs overflow-x-auto p-3 rounded bg-neutral-800">{`interface SpaceData {
  users: User[];
  mapid: string;
  mapObjects: MapObject[];
  collisionRects: { x: number; y: number; width: number; height: number }[];
  placeObjs: MapObject[];
  triggerObjs: MapObject[];
  meta: { width: number; height: number; tileSize: number };
}`}</pre>
            <p>
              Broadcasts exclude the initiating user to avoid echo duplication. When the last user leaves you may later add
              auto‑cleanup (not yet implemented) to free memory.
            </p>
          </Section>

          <Section id="map-loading" title="7. Map Loading & Object Extraction">
            <p>
              Tiled <code>.tmj</code> files are stored under the map package. <code>getMapData(mapId)</code> reads and parses JSON. Utility
              functions (in <code>logic.ts</code>) extract structured object layers for spawn points, collision rectangles, trigger zones
              and placeable objects. Only relevant subsets are kept in memory per space.
            </p>
          </Section>

          <Section id="realtime" title="8. Realtime Protocol (Messages)">
            <table className="not-prose w-full text-sm">
              <thead>
                <tr className="text-left border-b"><th>Direction</th><th>Type</th><th>Payload</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>client → server</td><td><code>join</code></td><td>{`{ spaceId }`}</td><td>Request to join a space.</td></tr>
                <tr><td>server → client</td><td><code>space-joined</code></td><td>self + players[]</td><td>Acknowledges join with initial state.</td></tr>
                <tr><td>server ↔ all</td><td><code>user-joined</code></td><td>id, tileX, tileY, char</td><td>Notify others a player arrived.</td></tr>
                <tr><td>client → server</td><td><code>move</code></td><td>newX, newY, spaceId</td><td>Proposed tile movement.</td></tr>
                <tr><td>server → client</td><td><code>movement approved</code></td><td>x, y</td><td>Authoritative position accepted.</td></tr>
                <tr><td>server → client</td><td><code>movement restricted</code></td><td>x, y</td><td>Collision: revert to authoritative.</td></tr>
                <tr><td>server → others</td><td><code>player moved</code></td><td>userId, x, y</td><td>Broadcast movement update.</td></tr>
                <tr><td>server → client</td><td><code>show-trigger</code></td><td>obj_id</td><td>Player is on a trigger tile.</td></tr>
                <tr><td>server → client</td><td><code>no-trigger</code></td><td>-</td><td>No active trigger.</td></tr>
                <tr><td>server → others</td><td><code>user-left</code></td><td>userId</td><td>A player disconnected.</td></tr>
                <tr><td>server → client</td><td><code>error</code></td><td>message</td><td>Protocol / state error.</td></tr>
              </tbody>
            </table>
          </Section>

          <Section id="movement" title="9. Movement & Collision">
            <p>
              Movement is tile‑based. Client sends intended tile coordinates. Server computes collision rectangles from map
              objects (once per space) and validates each move using <code>isColliding()</code>. On collision, the server rejects and
              re‑sends the last authoritative coordinates; otherwise it updates internal state and broadcasts to peers.
            </p>
          </Section>

          <Section id="triggers" title="10. Triggers & Interactions">
            <p>
              Trigger objects define interactive zones (e.g. portals, UI prompts). After a successful movement the server
              runs <code>getOnTrigger()</code> to determine if the new tile overlaps a trigger. If yes, a <code>show-trigger</code> message with
              metadata (like <code>obj_id</code>) is sent; otherwise <code>no-trigger</code>. Client can later map these to UI modals or actions.
            </p>
          </Section>

          <Section id="persistence" title="11. Persistence & Data Model">
            <p>
              Prisma models (in <code>packages/db/prisma/schema.prisma</code>) back spaces, maps and user participation. On join, DB is
              queried to confirm the space exists and fetch avatar / map association. Runtime state (positions, presence)
              lives purely in memory (and could be externalized to Redis for horizontal scaling).
            </p>
          </Section>

          <Section id="sequence" title="12. End‑to‑End Sequence (Example)">
            <pre className="text-xs overflow-x-auto p-3 rounded bg-neutral-800">{`Client                    HTTP API                 WS Server / RoomManager
 ──────                    ─────────                ─────────────────────────
 1. GET / -> load app
 2. POST /login ----------> issue JWT cookie
 3. open WebSocket --------------------------------> verify cookie/JWT
 4. send {type:join,spaceId}
                          DB: read space + map
                                            initSpace(): load map, extract objects
                                            choose spawn (getSpawnPoint)
                      <-------------------------------- space-joined
 5. render map + players
 6. send move(newX,newY) ---------------------------> validate collision / trigger
                      <---------------- movement approved | restricted
                      <---------------- player moved (to others)
 7. receive show-trigger -> show UI prompt
 8. close tab -------------------------------------> broadcast user-left
`}</pre>
          </Section>

          <Section id="extensibility" title="13. Extensibility Ideas">
            <ul>
              <li>Server‑side map hot‑reload & caching invalidation.</li>
              <li>Redis pub/sub for multi‑process horizontal scaling.</li>
              <li>Interest management (only broadcast nearby players).</li>
              <li>Actions / emotes protocol layer (<code>type: &quot;emote&quot;</code> messages).</li>
              <li>Optimistic client prediction with reconciliation.</li>
              <li>Space capacity & moderation events.</li>
              <li>Persist last known tile per user for resume.</li>
            </ul>
          </Section>

          <footer className="mt-16 text-xs opacity-70">Last updated {new Date().toISOString().split('T')[0]}</footer>
        </div>
        <Footer />
      </div>
    </>
  )
}
