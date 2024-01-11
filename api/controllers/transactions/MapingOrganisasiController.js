const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");
const { head } = require('lodash');
const { func } = require('joi');
const { Table } = require('mssql');
const path = require('path');
const glob = require("glob");
const json2xls = require('json2xls');
const { exec } = require('child_process');

module.exports = {
    find: async function(req, res){
        const {
            query: {m_user_id,filtertext}
        } = req;
        console.log(m_user_id,filtertext);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let where = ` where 1 = 1`;
            let filterLike = ``;
            if(filtertext && filtertext !== 'undefined'){
                filterLike = `and (asdh like '%${filtertext}%' or rsdh like '%${filtertext}%' or kode_sold_to like '%${filtertext}%'
                or kode_ship_to like '%${filtertext}%' or nama_ship_to like '%${filtertext}%' or nama_sold_to like '%${filtertext}%')`
            }
            let query = `select * from v_mapingorganisasi ${where} ${filterLike} order by kode_sold_to asc`;
            console.log(query);
            let rows = await request.query(query);
            rows = rows.recordset;
            // console.log(rows);
            return res.success({
                error : "false",
                message : "Berhasil",
                data : rows,
                
            })
        }catch(err){
            console.log(err);
            return res.console.error({

            });
        }
    },
    findOne : async function(res, req){
        const {
            query: {m_user_id,m_distributor_id}
          } = req;
      
        console.log(m_distributor_id);
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let where = ` where 1 = 1`;
            let filterLike = ` and m_distributor_id = '${m_distributor_id}'`;
            
            let query = `select * from v_mapingorganisasi ${where} ${filterLike}`;

            let rows = await request.query(query);
            rows = rows.recordset;
            console.log(rows);

            return res.success({
                error : "false",
                message : "Berhasil",
                data : rows,
                
            })
            return res.success({
                error : "false",
                message : "Successfully"
            })
        }catch(err){
            return res.error({

            });
        }
    },
    action: async function(req, res){
        const {m_user_id,act,m_distributor_id,kode_ship_to,email_asm,email_rsm} = req.body;
        await DB.poolConnect;

        console.log(req.body);
        try {
            const request = DB.pool.request();
            let exec = ``;
            let cekAsm = `select * from m_user where (username = '${email_asm}' OR email_verifikasi = '${email_asm}') and role_default_id = '62D970C9-001A-45AA-9C2A-359A89805F20'`;
            let cekRsm = `select * from m_user where (username = '${email_rsm}' OR email_verifikasi = '${email_rsm}') and role_default_id = '18A3683F-F6AE-4420-A055-6E1EC91B3204'`
            
            console.log('cekAsm ',cekAsm);
            console.log('cekRsm ',cekRsm);
            
            let dscekAsm = await request.query(cekAsm);
            let dscekRsm = await request.query(cekRsm);
            console.log("xxx",dscekAsm.recordset.length );
            if(dscekAsm.recordset.length == 0){
                return res.success({
                    error : "true",
                    message : `${email_asm} tidak dikenali sabagai ASM`
                })
            }
            if(dscekRsm.recordset.length == 0){
                return res.success({
                    error : "true",
                    message : `${email_rsm} tidak dikenali sabagai RSM`
                })
            }

            if(act == "replace"){
                exec = `exec sp_mutasi_rsdh '${email_rsm}','${kode_ship_to}'`;
            }

            console.log(exec);
            request.query(exec, async (err , result) =>{
                if (err){
                    return res.success({
                        error : "true",
                        message : err
                    })
                }
                if(act == "replace"){
                    let exec2 = `exec sp_mutasi_asdh '${email_asm}','${kode_ship_to}'`;
                    await request.query(exec2)
                    console.log(exec2);
                }

                let query = `select * from v_mapingorganisasi`;

                let rows = await request.query(query);
                rows = rows.recordset;

                return res.success({
                    error : "false",
                    message : "Successfully",
                    data : rows
                })
            })
            
        } catch (error) {
            return res.success({
                error : "true",
                message : error
            })
        }
    }
}