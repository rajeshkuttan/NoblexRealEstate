const { Cheque } = require('./src/models');

async function cleanupLease379() {
  try {
    const leaseId = 379;
    
    // Fetch all cheques for this lease
    const cheques = await Cheque.findAll({
        where: { leaseId },
        order: [['id', 'ASC']] // Process oldest first (keep these)
    });
    
    console.log(`Total cheques found: ${cheques.length}`);
    
    const uniqueMap = new Map();
    const idsToDelete = [];
    
    for (const cheque of cheques) {
        // Create a unique signature for the cheque
        // We use chequeNumber, Amount, and Date. 
        // For 'Pending' numbers, this ensures we only keep one per scheduled date/amount.
        const dateStr = cheque.chequeDate ? new Date(cheque.chequeDate).toISOString().split('T')[0] : 'no-date';
        const amt = Number(cheque.amount).toFixed(2);
        const num = String(cheque.chequeNumber).trim().toLowerCase();
        
        const signatures = [
            `${num}-${amt}-${dateStr}`,
            // Also handle case where date might be slightly different key but same logic? 
            // For now, strict match on date is safest to avoid deleting valid monthly sequence.
        ];
        
        const key = signatures[0];
        
        if (uniqueMap.has(key)) {
            // This is a duplicate!
            console.log(`Duplicate found! Keeping ID ${uniqueMap.get(key).id}, marking ID ${cheque.id} for deletion.`);
            idsToDelete.push(cheque.id);
        } else {
            uniqueMap.set(key, cheque);
        }
    }
    
    console.log(`Found ${idsToDelete.length} duplicates to delete.`);
    
    if (idsToDelete.length > 0) {
        await Cheque.destroy({
            where: {
                id: idsToDelete
            }
        });
        console.log('Deletion complete.');
    } else {
        console.log('No duplicates found needing deletion (based on strict criteria).');
    }
    
    // Final verify
    const finalCount = await Cheque.count({ where: { leaseId } });
    console.log(`Final count for lease ${leaseId}: ${finalCount}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupLease379();
