import { Effect, Schema } from "effect"
import { Markup, View, compose } from "spar"
import { dockerPostgres, dockerSqlite, grant, kit, reader } from "./code.ts"
import { highlight } from "./highlight.ts"

export const repoUrl = "https://github.com/SeeThruHead/effect-workflow-ui"

export const image = "ghcr.io/seethruhead/effect-workflow-ui"

const Shot = View.make(
  "Shot",
  { file: Schema.String, alt: Schema.String, caption: Schema.String, size: Schema.Literals(["wide", "phone"]) },
  ({ file, alt, caption, size }) => (
    <figure class={`shot ${size}`}>
      <img src={`shots/${file}`} alt={alt} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
)

const shot = (file: string, alt: string, caption: string, size: "wide" | "phone" = "wide") => (
  <Shot file={file} alt={alt} caption={caption} size={size} />
)

export const HomeView = View.make(
  "HomeView",
  {
    dockerPostgres: Markup.Markup,
    dockerSqlite: Markup.Markup,
    grant: Markup.Markup,
    reader: Markup.Markup,
    kit: Markup.Markup
  },
  (code) => (
    <main class="page">
      <header class="lead">
        <h1>Effect workflow UI</h1>
        <p>
          A read-only viewer for <a href="https://effect.website">Effect</a> cluster and Effect workflow runs. Point it
          at the SQL storage your cluster already writes, and it shows what needs attention, every run, and each run's
          steps: retries with their errors, durable sleeps, signals and compensations. It comes two ways: a Docker image
          you run beside your app, and the libraries it is built from, to embed in your own admin screens.
        </p>
        <p class="status">Early. Read-only: it never writes to your cluster. Postgres and SQLite.</p>
        <p class="links">
          <a class="button primary" href="demo/">
            Open the live demo
          </a>
          <a class="button" href={repoUrl}>
            Source on GitHub
          </a>
          <a class="button" href={`${repoUrl}/pkgs/container/effect-workflow-ui`}>
            Docker image
          </a>
        </p>
      </header>

      <section id="demo">
        <h2>Live demo</h2>
        <p>
          This is the real viewer, built as static files, replaying a recording of the sample shop app in this repo. The
          replay is set 20 minutes after the recording stopped, so it shows what you would see after a process died: two
          failed runs, a durable sleep that never fired because nothing was left to fire it, and a refund stuck waiting
          on an approval that never came.
        </p>
        <iframe class="demo" src="demo/" title="Effect workflow viewer replaying the sample shop" loading="lazy" />
        <p class="aside">
          <a href="demo/">Open the demo on its own page</a>, which also works on a phone.
        </p>
      </section>

      <section id="what">
        <h2>What it shows</h2>
        <p>
          <strong>Needs attention</strong> comes first: failed runs with their error, runs that are overdue (a durable
          sleep or a message that should have been handled and was not), runs that look stuck (suspended with nothing
          scheduled for longer than 15 minutes, or an activity running that long), and runs that are simply waiting,
          each with the reason in one line.
        </p>
        <p>
          <strong>Runs</strong> lists every run, newest first, with search over ids, inputs and errors, and filters by
          status and workflow.
        </p>
        {shot("runs.png", "The run list with status counts and filters", "Every run in the sample shop.")}
        <p>
          <strong>A run</strong> shows its input and result, its error with the cause, a timeline of every step, and the
          numbered history. Activities show each attempt; durable sleeps show when they wake; signals show when they
          arrived; a step that ran after a failure is marked as compensation. When you give the viewer your workflow
          definitions, inputs, results and errors are decoded with their own Schemas, and a stored payload that no
          longer decodes is flagged.
        </p>
        {shot(
          "run-flaky.png",
          "A run page with a charge that timed out twice before it succeeded",
          "An order whose card timed out twice: three attempts, each with its error."
        )}
        {shot(
          "run-declined.png",
          "A failed run with its compensation step",
          "A declined card: the order failed, and releasing the stock ran as compensation."
        )}
        <p>
          <strong>Cluster</strong> shows each entity type's mailbox: how many messages, how many are unprocessed, how
          many are past due and unread, and what is due next. A past-due message nobody reads is how a stalled storage
          loop shows itself, so it is flagged at the top. For clusters with several runners it lists each runner,
          whether it is healthy, the shards it holds, and any shard with messages that no runner holds.
        </p>
        {shot(
          "cluster.png",
          "The cluster page with mailboxes by entity type",
          "In the recording, the durable clock whose process died is past due and unread."
        )}
        {shot("run-phone.png", "A run page on a phone", "The same pages work at phone width.", "phone")}
      </section>

      <section id="who">
        <h2>Who it is for</h2>
        <p>
          Teams running Effect cluster and Effect workflow in production. Effect has no listing API for workflow runs:{" "}
          <code>WorkflowEngine</code> can poll one execution you already know the id of, and that is all. When a run
          stops moving today, people find out by querying <code>cluster_messages</code> by hand and reading{" "}
          <code>processed</code> and <code>last_read</code>. This puts the same facts on a page, for the person on call
          and for anyone who supports the people whose work runs through those workflows.
        </p>
      </section>

      <section id="docker">
        <h2>Run it with Docker</h2>
        <p>
          The image is a single compiled server plus the viewer's files. Give it a connection string to your cluster's
          database and open port 4317. It runs for linux/amd64 and linux/arm64.
        </p>
        <div markup={code.dockerPostgres} />
        <p>
          On Postgres every read runs inside a <code>READ ONLY</code> transaction. You can also give it a role that can
          only select the two tables it reads:
        </p>
        <div markup={code.grant} />
        <p>
          For SQLite, mount the directory that holds the database. It is opened read-only, but SQLite in WAL mode needs
          to see the database's <code>-wal</code> and <code>-shm</code> files beside it, so mount the directory rather
          than the single file, and not as a read-only mount.
        </p>
        <div markup={code.dockerSqlite} />
        <p>
          <code>CLUSTER_RECENT_HOURS</code> (default 168, a week) keeps reads small on a big cluster: the viewer reads
          the runs that started in that window and every run that has not finished, however old; <code>0</code> reads
          everything. <code>CLUSTER_TABLE_PREFIX</code> sets the table prefix if your cluster uses one other than{" "}
          <code>cluster</code>; <code>PORT</code> and <code>HOST</code> set where it listens.
        </p>
        <p>
          Effect stores the trace id of every message. Set <code>VIEWER_TRACE_URL</code> to your tracing tool's URL with{" "}
          <code>{"{traceId}"}</code> where the id goes (a Grafana Explore or Jaeger link, say) and each run page links
          to its trace.
        </p>
      </section>

      <section id="library">
        <h2>Use it as a library</h2>
        <p>
          <code>@effect-workflow/reader</code> reads the storage and folds it into runs. <code>executions</code> and{" "}
          <code>attention</code> are pure functions over the rows, so you can call them anywhere: an admin page, a CLI,
          an alert. Pass your workflow definitions to decode payloads with their Schemas.
        </p>
        <div markup={code.reader} />
        <p>
          <code>@effect-workflow/ui</code> is the component kit the viewer is made of: run list, run header, timeline,
          attempts, failure panels and history. It is built with <a href="https://foldkit.dev">Foldkit</a> and styled
          with StyleX, and ships its TypeScript source for your bundler to compile.
        </p>
        <div markup={code.kit} />
        <p class="note">
          The packages are not on npm yet; the release is waiting on the maintainer. Until then, clone the repo and use
          them from its workspace.
        </p>
      </section>

      <section id="how">
        <h2>How it reads your cluster</h2>
        <p>
          Effect cluster keeps everything a workflow does as messages. A workflow is an entity named{" "}
          <code>Workflow/&lt;name&gt;</code> whose id is the execution id; its <code>run</code> message holds the input;
          each activity attempt is an <code>activity</code> message; durable sleeps are messages to{" "}
          <code>Workflow/-/DurableClock</code> with a delivery time; signals are <code>deferred</code> messages; and
          results and errors are replies. Message and reply ids are snowflakes, so each carries the time it was written.
          The viewer runs two selects over <code>cluster_messages</code> and <code>cluster_replies</code> and works the
          rest out in the browser.
        </p>
        <p>What storage cannot tell it, it does not pretend to know:</p>
        <ul>
          <li>Which signal a run is waiting on. Storage names a signal only once it arrives.</li>
          <li>
            Which step undoes which. A step that started after another step failed is shown as a compensation, but not
            what it compensates.
          </li>
          <li>The input of an activity. Storage keeps its name and attempt number, and its result.</li>
        </ul>
      </section>

      <section id="status">
        <h2>Status</h2>
        <p>
          Early, and changing. It has the needs-attention page, the run list, the run page with a link to each run's
          trace, the cluster page with mailboxes and runners, and reads only recent runs plus every run still going.
          Next: links from each step to its own span, alerts from the needs-attention rules, and actions (interrupt,
          resume, run again) through your app rather than the tables.
        </p>
      </section>
    </main>
  )
)

export const Home = compose(() =>
  Effect.succeed({
    dockerPostgres: Markup.trusted(highlight(dockerPostgres, "sh")),
    dockerSqlite: Markup.trusted(highlight(dockerSqlite, "sh")),
    grant: Markup.trusted(highlight(grant, "sh")),
    reader: Markup.trusted(highlight(reader, "ts")),
    kit: Markup.trusted(highlight(kit, "ts"))
  })
)(HomeView)
