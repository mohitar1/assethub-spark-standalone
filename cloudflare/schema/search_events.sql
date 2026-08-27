CREATE TABLE IF NOT EXISTS search_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      TEXT    NOT NULL,
  user_email   TEXT,
  user_country TEXT,
  user_role    TEXT,
  search_term  TEXT    NOT NULL DEFAULT '',
  search_type  TEXT    NOT NULL DEFAULT 'all',  -- all | assets | products | templates
  result_count INTEGER,
  occurred_at  TEXT    NOT NULL                 -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_se_user    ON search_events(user_id);
CREATE INDEX IF NOT EXISTS idx_se_ts      ON search_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_se_term    ON search_events(search_term);
CREATE INDEX IF NOT EXISTS idx_se_type    ON search_events(search_type);
CREATE INDEX IF NOT EXISTS idx_se_country ON search_events(user_country);

CREATE TABLE IF NOT EXISTS search_event_markets (
  event_id  INTEGER NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  market    TEXT    NOT NULL,
  PRIMARY KEY (event_id, market)
);

CREATE INDEX IF NOT EXISTS idx_sem_market ON search_event_markets(market);
CREATE INDEX IF NOT EXISTS idx_sem_event  ON search_event_markets(event_id);
