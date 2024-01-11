const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const DBPROP = require("../../services/DBPROPOSAL");
const moment = require('moment');
const json2xls = require('json2xls');

module.exports = {
    find: async function(req, res) {
        const {
          query: { currentPage, pageSize }
        } = req;
    
        const requesteprop = await DBPROP.promise();
        await DB.poolConnect;
        try {

            const request = DB.pool.request();
    
          let queryDataTable = `SELECT murv.username,murv.nama AS roles,murv.nama_user AS nama,
          COALESCE(mso.system_name,'E-Sales & E-Logistics') AS system_name,mso.username AS username_eprop
          FROM m_user_role_v murv
          LEFT JOIN m_user_sso mso ON(murv.m_user_id = mso.m_user_id) WHERE murv.nama_user <> 'SYSTEM' AND murv.nama <> 'INTERNALAUDIT'`;
          console.log(queryDataTable)
    
          request.query(queryDataTable, async (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            let rows = result.recordset;
            

            for (let i = 0; i < rows.length; i++) {
                
                    
                    let username_eprop = rows[i].username_eprop;

                    if(username_eprop){
                        let sqlgetuserEprop = `SELECT e.*,mut.user_type FROM employee e LEFT JOIN m_user_type mut ON (mut.user_type_id = e.user_type_id)
                        WHERE e.active=1 AND e.employee_id = '${username_eprop}' LIMIT 1`;
                        let [result] = await requesteprop.query(sqlgetuserEprop);
                        rows[i].user_type = result.length > 0 ? result[0].user_type : '';                        

                    }
                
            }


            let arraydetailsforexcel = [];
            for (let i = 0; i < rows.length; i++) {
               
                    if(rows[i].user_type){

                        rows[i].roles = rows[i].user_type;
                    }
                delete rows[i].username_eprop;
                delete rows[i].user_type;

                let obj = {
                    "Username": rows[i].username,
                    "Nama":rows[i].nama,
                    "Roles": rows[i].roles,
                    "System Application": rows[i].system_name
                }

                arraydetailsforexcel.push(obj);


            }


            if(arraydetailsforexcel.length > 0){
                let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
                let namafile = 'data_user_esales_'.concat(tglfile).concat('.xlsx');          
                var hasilXls = json2xls(arraydetailsforexcel);
                res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
                res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
                res.end(hasilXls, 'binary');
              }else{
        
                return res.error({
                  message: "Data tidak ada"
                });
        
              }
            
          });
        } catch (err) {
          return res.error(err);
        }
      },
}