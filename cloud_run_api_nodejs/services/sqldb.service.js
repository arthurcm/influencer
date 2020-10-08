const { Pool } = require('pg');
const { toASCII } = require('punycode');

class SQLDbService {
    pool = new Pool({
        user: 'gcf',
        // host: '34.70.211.131',
        database: 'auth',
        password: '967Shoreline',
        host: '/cloudsql/influencer-272204:us-central1:influencersql',
        port: 5432,
    });

    getUserBalance(influencer_id) {
        // const client = await pool.connect()
        return this.pool.query('SELECT * FROM influencer_account WHERE influencer_id = $1', [influencer_id]);
    }

    getUserTransactionHistory(influencer_id) {
        return this.pool.query('SELECT * FROM influencer_transaction WHERE influencer_id = $1', [influencer_id]);
    }

    async addCampaignPayment(influencer_id, amount, campaign_id) {
        const client = await this.pool.connect();
        let status = {};
        try {
            await client.query('BEGIN');
            const accountQuery = 'SELECT * FROM influencer_account WHERE influencer_id = $1';
            const result = await client.query(accountQuery, [influencer_id]);
            console.log(result.rows);
            if (result.rows.length <= 0) {
                status = { error: 'influencer not found' };
                return status;
            }
            const account_info = result.rows[0];

            const accountUpdateQuery = 'UPDATE influencer_account SET pending_balance = pending_balance + $1, ' +
                'total_earning = total_earning + $1 WHERE influencer_id = $2';
            await client.query(accountUpdateQuery, [amount, influencer_id]);
            const transactionQuery =
                'INSERT INTO influencer_transaction(influencer_id, transaction_type, status, amount, ' +
                'before_account_balance, after_account_balance, before_pending_balance, after_pending_balance, meta_data) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
            await client.query(transactionQuery, [
                influencer_id,
                'CAMPAIGN_PAY',
                'PENDING',
                amount,
                account_info['account_balance'],
                account_info['account_balance'],
                account_info['pending_balance'],
                account_info['pending_balance'] + amount,
                {campaign_id},
            ]);
            const commit = await client.query('COMMIT');
            status = { status: 'OK' };
            console.log(commit);
        } catch (e) {
            await client.query('ROLLBACK');
            status = { error: e };
            throw e;
        } finally {
            client.release();
        }
        return status;
    }

    async cashOutBalance(influencer_id, amount) {
        const client = await this.pool.connect();
        let status = {};
        try {
            await client.query('BEGIN');
            const accountQuery = 'SELECT * FROM influencer_account WHERE influencer_id = $1';
            const result = await client.query(accountQuery, [influencer_id]);
            console.log(result.rows);
            if (result.rows.length <= 0) {
                status = { error: 'influencer not found' };
                return status;
            }
            const account_info = result.rows[0];
            if (account_info['account_balance'] < amount) {
                status = { error: 'account balance insufficient' };
                return status;
            }

            const accountUpdateQuery = 'UPDATE influencer_account SET account_balance = account_balance - $1 WHERE influencer_id = $2';
            await client.query(accountUpdateQuery, [amount, influencer_id]);
            const transactionQuery =
                'INSERT INTO influencer_transaction(influencer_id, transaction_type, status, amount, ' +
                'before_account_balance, after_account_balance, before_pending_balance, after_pending_balance) ' +
                'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            await client.query(transactionQuery, [
                influencer_id,
                'CASH_OUT',
                'DONE',
                amount,
                account_info['account_balance'],
                account_info['account_balance'] - amount,
                account_info['pending_balance'],
                account_info['pending_balance'],
            ]);
            const commit = await client.query('COMMIT');
            status = { status: 'OK' };
            console.log(commit);
        } catch (e) {
            await client.query('ROLLBACK');
            status = { error: e };
            throw e;
        } finally {
            client.release();
        }
        return status;
    }

    async convertCampaignPayment(influencer_id, convert_date) {
        const client = await this.pool.connect();
        let status = {};
        try {
            await client.query('BEGIN');
            const accountQuery = 'SELECT * FROM influencer_account WHERE influencer_id = $1';
            const result = await client.query(accountQuery, [influencer_id]);
            console.log(result.rows);
            if (result.rows.length <= 0) {
                status = { error: 'influencer not found' };
                return status;
            }
            const account_info = result.rows[0];

            const transactionQuery = 'SELECT * FROM influencer_transaction WHERE influencer_id = $1 AND ' +
                'transaction_time <= $2 AND transaction_type = $3 AND status = $4';
            const transactions = await client.query(transactionQuery, [influencer_id, convert_date, 'CAMPAIGN_PAY', 'PENDING']);
            const match_trans = transactions.rows;
            console.log(match_trans);

            let total_amount = 0;
            match_trans.forEach(async (row) => {
                console.log(row);
                total_amount = total_amount + row.amount;
                const transactionUpdateQuery = 'UPDATE influencer_transaction SET status = $1 WHERE id = $2';
                await client.query(transactionUpdateQuery, ['DONE', row.id]);
            });

            console.log(total_amount);

            if (total_amount > 0) {
                const accountUpdateQuery = 'UPDATE influencer_account SET account_balance = account_balance + $1, ' +
                    'pending_balance = pending_balance - $2 WHERE influencer_id = $3';
                await client.query(accountUpdateQuery, [total_amount, total_amount, influencer_id]);
                const transactionQuery =
                    'INSERT INTO influencer_transaction(influencer_id, transaction_type, status, amount, ' +
                    'before_account_balance, after_account_balance, before_pending_balance, after_pending_balance) ' +
                    'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
                await client.query(transactionQuery, [
                    influencer_id,
                    'CREDIT_CONVERT',
                    'DONE',
                    total_amount,
                    account_info['account_balance'],
                    account_info['account_balance'] + total_amount,
                    account_info['pending_balance'],
                    account_info['pending_balance'] - total_amount,
                ]);
            }

            const commit = await client.query('COMMIT');
            console.log(commit);
            status = { status: 'OK' };
        } catch (e) {
            await client.query('ROLLBACK');
            status = { error: e };
            throw e;
        } finally {
            client.release();
        }
        return status;
    }
}

module.exports = SQLDbService;
