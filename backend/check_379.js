const { Lease, Cheque } = require('./src/models');

async function checkLease379() {
  try {
    const leaseId = 379;
    
    // 1. Check Lease Definition
    const lease = await Lease.findByPk(leaseId);
    if (!lease) {
        console.log(`Lease ${leaseId} not found.`);
        return;
    }
    
    let schedule = [];
    if (lease.pdcSchedule) {
        if (typeof lease.pdcSchedule === 'string') {
            try { schedule = JSON.parse(lease.pdcSchedule); } catch(e) {}
        } else {
            schedule = lease.pdcSchedule;
        }
    }
    console.log(`Lease ${leaseId} 'pdcSchedule' length: ${schedule.length}`);
    console.log('--- Schedule Dump (First Item) ---');
    console.log(JSON.stringify(schedule[0], null, 2));

    // 2. Check Actual Cheque Rows
    const cheques = await Cheque.findAll({
        where: { leaseId },
        attributes: ['id', 'chequeNumber', 'amount', 'chequeDate'],
        order: [['id', 'ASC']]
    });
    
    console.log(`Actual rows in 'Cheques' table for lease ${leaseId}: ${cheques.length}`);
    
    console.log('--- Cheque Rows Dump ---');
    cheques.forEach(c => {
        console.log(`ID: ${c.id}, Num: ${c.chequeNumber}, Amt: ${c.amount}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkLease379();
