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

const strtotime = require('locutus/php/datetime/strtotime'); 
const mt_rand = require('locutus/php/math/mt_rand'); 
const moment = require('moment');
module.exports = {

  addcost: async function(req, res) {
    let {m_user_id,budget} = req.body;
    await DB.poolConnect;
    try {
       const request = DB.pool.request();
       const request2 = await DBPROP.promise();
       let validationlist = [];
       budget = budget.filter(e => Number(e.jumlah_add_cost) > 0);


       let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
       let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
       let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;

    
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
            let jumlah_add_cost = Number(budget[i].jumlah_add_cost);
            if(jumlah_add_cost <= 0){
                validationlist.push(`Budget tidak boleh 0 atau minus`)
            }
        
        }

        if(validationlist.length > 0){
            return res.error({
                message: validationlist[0].toString()
            });
        }else{

            for (let i = 0; i < budget.length; i++) {

                let proposal_budget_id_new = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                const proposal_budget_id = budget[i].proposal_budget_id;
                let jumlah_add_cost = Number(budget[i].jumlah_add_cost);

                console.log('proposal_budget_id_new ',proposal_budget_id_new);
                console.log('proposal_budget_id ',proposal_budget_id);

                let sqlInsert = `INSERT INTO proposal_budget
                (proposal_budget_id, proposal_id, activity_id, branch_code, branch_description, brand_code, budget, created_by, created_date, updated_by, updated_date, info_budget, 
                bulan, nilai_so, NOTE, flag_kirim, cost_rasio, ismigration, isaddcost)
                SELECT 
                '${proposal_budget_id_new}' AS proposal_budget_id, proposal_id, activity_id, branch_code, branch_description, brand_code, 
                ${jumlah_add_cost} AS budget,'${nama}' AS created_by, NOW() as created_date, '${nama}' AS updated_by, 
                NOW() AS updated_date, info_budget, 
                bulan, nilai_so, NOTE, flag_kirim, cost_rasio, ismigration,'Y' AS isaddcost
                FROM proposal_budget pb WHERE proposal_budget_id = '${proposal_budget_id}'`;


                console.log(sqlInsert);
                await request2.query(sqlInsert);

            }

            return res.success({
                message: 'Add cost Budget Successfully'
            });
        }
       
    } catch (err) {
      return res.error(err);
    }
  }
};

