-- User Logins Table
-- Stores user login data captured at authentication for reporting purposes

CREATE TABLE IF NOT EXISTS user_logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identifiers
  user_id TEXT,
  email TEXT UNIQUE NOT NULL,
  
  -- Profile fields
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  country TEXT,
  employee_type TEXT,
  company TEXT,
  
  -- Authorization/Access (stored as pipe-delimited strings)
  roles TEXT,
  permissions TEXT,
  
  -- Timestamps
  first_login_date TEXT NOT NULL,
  last_login_date TEXT NOT NULL,
  last_updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email ON user_logins(email);
CREATE INDEX IF NOT EXISTS idx_user_id ON user_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_first_login ON user_logins(first_login_date);
CREATE INDEX IF NOT EXISTS idx_roles ON user_logins(roles);
CREATE INDEX IF NOT EXISTS idx_permissions ON user_logins(permissions);
