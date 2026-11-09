CREATE TABLE IF NOT EXISTS pieces(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,body TEXT NOT NULL,created INTEGER NOT NULL,day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS pieces_day ON pieces(day);
CREATE TABLE IF NOT EXISTS houses(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,body TEXT NOT NULL,created INTEGER NOT NULL,day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS houses_day ON houses(day);
CREATE TABLE IF NOT EXISTS intake_days(day TEXT PRIMARY KEY,n INTEGER NOT NULL);
INSERT OR IGNORE INTO intake_days(day,n) SELECT day,count(*) FROM (SELECT day FROM pieces UNION ALL SELECT day FROM houses) GROUP BY day;
CREATE TABLE IF NOT EXISTS intake_queue(id INTEGER PRIMARY KEY CHECK(id=1),n INTEGER NOT NULL);
INSERT OR IGNORE INTO intake_queue(id,n) VALUES(1,(SELECT (SELECT count(*) FROM pieces)+(SELECT count(*) FROM houses)));
CREATE INDEX IF NOT EXISTS pieces_created_id ON pieces(created,id);
CREATE INDEX IF NOT EXISTS houses_created_id ON houses(created,id);

CREATE TABLE IF NOT EXISTS public_houses(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,body TEXT NOT NULL,created INTEGER NOT NULL,day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS public_houses_created_id ON public_houses(created,id);
CREATE TRIGGER IF NOT EXISTS intake_count_public_houses AFTER INSERT ON public_houses BEGIN INSERT INTO intake_days(day,n) VALUES(NEW.day,1) ON CONFLICT(day) DO UPDATE SET n=n+1; END;
CREATE TRIGGER IF NOT EXISTS intake_queue_add_public_houses AFTER INSERT ON public_houses BEGIN UPDATE intake_queue SET n=n+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS intake_queue_remove_public_houses AFTER DELETE ON public_houses BEGIN UPDATE intake_queue SET n=n-1 WHERE id=1; END;
