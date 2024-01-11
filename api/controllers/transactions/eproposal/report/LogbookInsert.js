// const { calculateLimitAndOffset, paginate } = require("paginate-info");
// const uuid = require("uuid/v4");
// const bcrypt = require('bcryptjs');
// const moment = require("moment");
// const randomToken = require('random-token');
// const DBPROP = require("../../../../services/DBPROPOSAL");
// module.exports = {
//     insertlogbook: async function (req, res) {
//         const { logbook_id,company ,branch ,branch_code,doc_no ,proposal_date,
//             title,budget_month_period,budget_year,nominal_budget,nominal_klaim,sisa_budget,status,reject_by,
//             reject_date,alasan_reject,activity_code,activity_desc,first_approval_name,start_date,end_date,
//             brand,last_approve,nomor_klaim,distributor,channel,outlet,group_name,created_by} = req.body; // --> terima request user
//         // console.log(nama,kode,email,kode_pajak,district);

//         // return res.error("xxxx")
//         await DB.poolConnect; //--> inisialisasi variable DB
//         try {
//             const request = await DBPROP.promise();
//             const requestEsales = DB.pool.request();
//             // const request = DB.pool.request(); //--> init var request koneksi
            
//                 const insertlogbook = `insert into logbook_new (logbook_id,company ,branch ,branch_code,doc_no ,proposal_date,
//                     title,budget_month_period,budget_year,nominal_budget,nominal_klaim,sisa_budget,status,reject_by,
//                     reject_date,alasan_reject,activity_code,activity_desc,first_approval_name,start_date,end_date,
//                     brand,last_approve,nomor_klaim,distributor,channel,outlet,group_name,created_by)
//                     values ('${logbook_id}','${company}','${branch}','${branch_code}','${doc_no}','${proposal_date}','${title}',
//                     '${budget_month_period}','${budget_year}',${nominal_budget},${nominal_klaim},${sisa_budget},'${status}','${reject_by}',
//                     '${reject_date}','${alasan_reject}','${activity_code}','${activity_desc}','${first_approval_name}','${start_date}','${end_date}',
//                     '${brand}','${last_approve}','${nomor_klaim}','${distributor}','${channel}','${outlet}','${group_name}','${created_by}')`
//                 console.log(insertlogbook);
//                 await requestEsales.query(insertlogbook);

//                 return res.success({
//                     message: "data berhasil di Insert"
//                 });

//         } catch (err) {
//             return res.error(err);
//         }
//     },
// };