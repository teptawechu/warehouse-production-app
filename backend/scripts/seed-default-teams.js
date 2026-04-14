import { pool } from "../src/db.js";

function buildTeamRows() {
  const rows = [];
  for (let i = 1; i <= 30; i += 1) {
    const code = `KLL${String(i).padStart(2, "0")}`;
    rows.push([code, `กองงาน ${code}`, null, 1]);
  }
  for (let i = 1; i <= 10; i += 1) {
    const code = `HK${String(i).padStart(2, "0")}`;
    rows.push([code, `กองงาน ${code}`, null, 1]);
  }
  return rows;
}

async function main() {
  const rows = buildTeamRows();
  for (const [teamCode, teamName, leader, active] of rows) {
    await pool.execute(
      `INSERT INTO teams (team_code, team_name, team_leader, is_active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         team_name = VALUES(team_name),
         team_leader = VALUES(team_leader),
         is_active = VALUES(is_active)`,
      [teamCode, teamName, leader, active]
    );
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${rows.length} teams.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
