/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const numeral = require("numeral");
 const axios = require("axios");
 const DBPROP = require("../../../services/DBPROPOSAL"); 
 const DBPORTAL = require('./../../../services/DBPORTAL.js');
 module.exports = {
 
   reversal: async function(req, res) {
    let {m_user_id,budget} = req.body;
     await DB.poolConnect;
     try {
        const request = DB.pool.request();
        const request2 = await DBPROP.promise();
        let validationlist = [];
        budget = budget.filter(e => e.outstanding_klaim > 0);


        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
        console.log(nama);


        if(!nama){

            let username_eprop = useresales.username_eprop;
            let sqlgetusereprop = `SELECT * FROM employee WHERE employee_id = '${username_eprop}'`;
            let datausereprop = await request2.query(sqlgetusereprop);
            let usereprop = datausereprop.length > 0 ? datausereprop[0][0] : null;

            if(usereprop){

                nama = usereprop.name;

            }else{

                let sqlgetuseresales = `SELECT mu.m_user_id,mu.nama,mus.username AS username_eprop  FROM m_user mu,m_user_sso mus 
                WHERE (mu.m_user_id = '${m_user_id} ON nik = '${m_user_id}')'
                AND mus.m_user_id = mu.m_user_id`;
                let datauseresales = await request.query(sqlgetuseresales);
                let useresales =datauseresales.recordset.length > 0 ? datauseresales.recordset[0] : null;

                nama = useresales.nama;


            }
        }
        
        for (let i = 0; i < budget.length; i++) {
            let budgettoapprove = budget[i].budgettoapprove;
            let total_klaim = budget[i].total_klaim;
            let outstandingklaim = budgettoapprove - total_klaim;
            let jumlah_reversal = budget[i].jumlah_reversal;

            if(jumlah_reversal > outstandingklaim){
                validationlist.push(`Reversal over budget maksimal hanya ${numeral(outstanding_klaim)}`)
            }
            
        }

        if(validationlist.length > 0){
            return res.error({
                message: validationlist[0].toString()
            });
        }else{
            if(budget.length > 0){

  

                let proposal_budget_id = budget[0].proposal_budget_id;
                let sqlgetproposal = `SELECT a.proposal_id,b.status_id FROM proposal_budget a,proposal b WHERE a.proposal_budget_id = '${proposal_budget_id}' AND a.proposal_id = b.proposal_id`;
                let dataproposal = await request2.query(sqlgetproposal);
                let proposal_id = dataproposal[0][0].proposal_id;
                let status_id = dataproposal[0][0].status_id;

                let cekfullorpartial = budget.filter(e => e.outstanding_klaim > 0 && e.outstanding_klaim !=  e.jumlah_reversal);
                console.log('Partial Approve',cekfullorpartial.length);

                let statusreverse = 'Full Budget Reverse';
                if(cekfullorpartial.length > 0){
                    statusreverse = 'Partial Approve';
                }else{
                    status_id = 40;
                }
                for (let i = 0; i < budget.length; i++) {
                    let proposal_budget_id = budget[i].proposal_budget_id;
                    let jumlah_reversal = budget[i].jumlah_reversal;

                    if(jumlah_reversal > 0){

                        let sqlinsertReverse = `INSERT INTO proposal_reverse
                        (proposal_budget_id, reverse_amount, reverse_by, m_user_id)
                        VALUES(${proposal_budget_id}, ${jumlah_reversal}, '${nama}', '${m_user_id}')`;
                        await request2.query(sqlinsertReverse);
        
                        let sqlInserbudget = `
                        INSERT INTO budget(group_id, brand_code, quarter, budget, year, active, created_by, created_date, updated_by, updated_date, keterangan, bulan)
                        SELECT b.group_id,a.brand_code, CASE WHEN a.bulan > 0 AND a.bulan <= 3 THEN 'Q1' WHEN a.bulan > 3 AND a.bulan <= 6 THEN 'Q2' WHEN a.bulan > 6 AND a.bulan <= 9 THEN 'Q3' ELSE 'Q4' END as quarter,
                        ${jumlah_reversal} AS jumlah_reversal,p.budget_year,1 AS active,'${nama}' AS created_by,now() AS created_date,'${nama}' AS updated_by,
                        now() AS updated_date,'Reverse Budget Oleh ${nama}',a.bulan
                        FROM proposal_budget a,activity b,proposal p 
                        WHERE a.proposal_budget_id = '${proposal_budget_id}'
                        AND a.activity_id = b.activity_code AND b.active=1
                        AND a.proposal_id = p.proposal_id`;
                        await request2.query(sqlInserbudget);
                    }
                    
    
                }

                let sqlupdatestatusproposal = `UPDATE proposal SET status='${statusreverse}',status_id=${status_id} WHERE proposal_id = '${proposal_id}'`;
                await request2.query(sqlupdatestatusproposal);
            }

            return res.success({
                message: 'Reversal Budget Successfully'
            });

        }
    

     } catch (err) {
       return res.error(err);
     }
   }
 };
 
 