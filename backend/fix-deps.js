const { getPool } = require('./db.js');
async function fix() {
  try {
    const db = await getPool();
    await db.query("UPDATE departamentos SET nome = 'IT' WHERE nome = 'Designer e IT'");
    await db.query("UPDATE departamentos SET nome = 'Marketing e Design' WHERE nome = 'Marketing'");
    await db.query("DELETE FROM departamentos WHERE nome = 'Design'");
    console.log('Fixed');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
