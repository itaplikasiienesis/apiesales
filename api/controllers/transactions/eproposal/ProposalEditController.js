const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
const _ = require('lodash');
const fs = require("fs");
const path = require('path');
const glob = require("glob");

const strtotime = require('locutus/php/datetime/strtotime'); 
const mt_rand = require('locutus/php/math/mt_rand'); 
const { log } = require("locutus/php/math");

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);


module.exports = {
    
    editProposal: async function (req, res) {
        const {
          proposal_id,budget_year,proposal_no,proposal_date,user_id,title,region_id,
          company_code,division_code,month_proposal,mechanism,kpi,objective,
          total_budget,status_id,sales_target,avg_sales,avg_sales_target,
          cost_ratio,sku,start_date,end_date,background,created_by,
          created_date,executor,emaildistributor,budget,markettype,distributor,file
        } = JSON.parse(req.body.document);  //di bungkus dalam key document seperti biasa ya yas 
        let fileList = [] // nanti list file yg di upload akan ada di dalam variable ini
    
        // console.log(proposal_id);
        // console.log(emaildistributor);
        
        const generatedID = proposal_id; //variable genereatedID dipakai untuk sub folder file tersimpan
        var uploadFile = req.file("file");
          uploadFile.upload({maxBytes: 500000000000000},
            async function onUploadComplete(err, files) {
              if (err) {
                let errMsg = err.message
                return res.error(errMsg)
              }
              // console.log('files', files)
              let noFile = 0
              for (const file of files) {
                noFile++
                //isi variable fileList dengan file yg di upload user
                fileList.push({
                      uid: noFile,
                      name: file.filename,
                      status: 'done',
                      url: ''
                })
                console.log('filename', file.filename) 
                fs.mkdirSync(dokumentPath( 'dokumenproposal', generatedID), {
                  recursive: true
                })
                const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('dokumenproposal', generatedID), file.filename) + '*');
                if (filesamaDir.found.length > 0) {
                    console.log('isexist file nama sama', filesamaDir.found[0])
                    fs.unlinkSync(filesamaDir.found[0])
                }
                fs.renameSync(file.fd, path.resolve(dokumentPath('dokumenproposal', generatedID), file.filename));
              } 

              try {
                const request = await DBPROP.promise();
                let brandplossa = false;
                let brandcode = budget.map(function (item) {
                if(item['brand_code']=='PLOSS'){
                      brandplossa = true
                }
                  return item['brand_code'];
                });
              
                let valueIN = "";
                for (const datas of brandcode) {
                    valueIN += ",'" + datas + "'"
                }
            
                valueIN = valueIN.substring(1);
    
                let errMessage = [];
                let is_referensi = 0;
    
                let activity_code = budget.map(function (item) {
                  return item['activity_code'];
                });
            
                let ActivityvalueIN = "";
                for (const datas of activity_code) {
                  ActivityvalueIN += "," + datas + ""
                }
                ActivityvalueIN = ActivityvalueIN.substring(1);
    
                let sqlgetApproval = `SELECT * FROM workflow where division = '${division_code}' AND activity LIKE ('%${ActivityvalueIN}%')`;            
                let dataapproval = await request.query(sqlgetApproval);
                let approval = dataapproval[0];
    
                if(approval.length==0){
                  let sqlgetApproval = `SELECT * FROM workflow where division = '${division_code}'`;
                  dataapproval = await request.query(sqlgetApproval);
                  approval = dataapproval[0];
                }
    
                let workflow_id = approval.length > 0 && status_id!=0 ? `'${approval[0].workflow_id}'` : `NULL`;
          
                let sqlgetlastNumber = `SELECT SUBSTRING(doc_no,1,6) as last_number
                from proposal ORDER BY SUBSTRING(doc_no,1,6) DESC LIMIT 1`;
                let datalastnumber = await request.query(sqlgetlastNumber);
                let lastnumber = datalastnumber[0][0].last_number;
          
          
                if( lastnumber=='' ) {
                  lastnumber = "000001";
                } else {
                  lastnumber = lastnumber + 1;
                  if( lastnumber.length == 1){
                    lastnumber = "00000".concat(lastnumber);
                  } else if( lastnumber.length == 2){
                    lastnumber = "0000".concat(lastnumber);
                  } else if( lastnumber.length == 3){
                    lastnumber = "000".concat(lastnumber);
          
                  } else if( lastnumber.length == 4){
                    lastnumber = "00".concat(lastnumber);
          
                  } else if( lastnumber.length == 5){
                    lastnumber = "0".concat(lastnumber);
          
                  }
              }
          
              let companyForDoc = ``;
          
              if(brandplossa){
                
                companyForDoc = 'SEI';
          
              }else{
                let sqlgetCompanyFordoc = `SELECT mc.company_code FROM m_brand
                JOIN m_company mc ON mc.company_id = m_brand.company_id
                WHERE brand_code IN (${valueIN}) 
                GROUP BY m_brand.company_id`;
                let dataCompanyFordoc = await request.query(sqlgetCompanyFordoc);
                companyForDoc = dataCompanyFordoc[0][0].company_code;
              }
          
          
              let sqlgetCompanycodes = `SELECT mc.company_code FROM m_brand
              JOIN m_company mc ON mc.company_id = m_brand.company_id
              WHERE brand_code IN(${valueIN})
              GROUP BY m_brand.company_id`;
              let dataCompanyCodes = await request.query(sqlgetCompanycodes);
          
              let startdate = moment(start_date,'YYYY-MM-DD').format('YYYY-MM-DD');
              let enddate = moment(end_date,'YYYY-MM-DD').format('YYYY-MM-DD');
              let proposaldate = moment(proposal_date,'YYYY-MM-DD').format('YYYY-MM-DD');

              let sqlUpdateHeader = `UPDATE proposal
              SET budget_year=${budget_year}, doc_no='${proposal_no}', title='${title}', 
              proposal_date='${proposaldate}', company_code='${company_code}', 
              division_code='${division_code}', month_proposal='${month_proposal}', region_id='${region_id}',
              brand_text='${sku}', total_budget=${total_budget},
              sales_target=${sales_target}, avg_sales=${avg_sales}, 
              workflow_id=${workflow_id}, mechanism='${mechanism}', 
              kpi='${kpi}', objective='${objective}', background='${background}', 
              is_referensi=${is_referensi},
              start_date='${startdate}', 
              end_date='${enddate}', 
              updated_by='${created_by}', 
              updated_date=now()
              WHERE proposal_id=${proposal_id}`;         

              await request.query(sqlUpdateHeader);
                
            
              let email = emaildistributor;
              let updateEmailDistributor = `UPDATE proposal_email_distributor
              SET email_distributor='${email}'
              WHERE proposal_id=${proposal_id}`;
              await request.query(updateEmailDistributor);

              await request.query(`DELETE FROM proposal_executor WHERE proposal_id=${proposal_id}`);
              for (let i = 0; i < executor.length; i++) {
                  
                let employee_id = executor[i].id;
                let proposal_executor_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalExecutor = `INSERT INTO proposal_executor
                (proposal_executor_id, proposal_id, employee_id, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_executor_id}, ${proposal_id},${employee_id},'${created_by}',now(),'${created_by}',now())`;

                await request.query(insertProposalExecutor);
                
              }
                
              await request.query(`DELETE FROM proposal_branch WHERE proposal_id=${proposal_id}`);
              let proposal_branch = _.uniqBy(budget,'branch_code');
              for (let i = 0; i < proposal_branch.length; i++) {
                
                let branch_code = proposal_branch[i].branch_code;
                let sqlgetbranddesc = `SELECT * FROM m_branch WHERE branch_code='${branch_code}'`;
                let databranch = await request.query(sqlgetbranddesc);
                let branch = databranch[0][0];
                let branch_desc = branch.branch_desc;
                let proposal_branch_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalBranch = `INSERT INTO proposal_branch
                (proposal_branch_id, proposal_id, branch_code,branch_desc, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_branch_id}, ${proposal_id}, '${branch_code}','${branch_desc}', '${created_by}',now(),'${created_by}',now())`;
                await request.query(insertProposalBranch);          
              }
          
              await request.query(`DELETE FROM proposal_activity WHERE proposal_id=${proposal_id}`);
              let proposal_activity = _.uniqBy(budget,'activity_code');
              for (let i = 0; i < proposal_activity.length; i++) {
                
                let activity_code = proposal_activity[i].activity_code;
                let proposal_activity_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalActivity = `INSERT INTO proposal_activity
                (proposal_activity_id, proposal_id, activity_id, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_activity_id}, ${proposal_id}, '${activity_code}', '${created_by}',now(),'${created_by}',now())`;
                await request.query(insertProposalActivity);          
              }
          
              await request.query(`DELETE FROM proposal_market WHERE proposal_id=${proposal_id}`);
              for (let i = 0; i < markettype.length; i++) {
      
                let market_type_id = markettype[i].market_type_code;
                let proposal_market_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalMarket = `INSERT INTO proposal_market
                (proposal_market_id, proposal_id, market_type_id, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_market_id}, ${proposal_id}, '${market_type_id}', '${created_by}',now(),'${created_by}',now())`;
                await request.query(insertProposalMarket);      
      
              }
          
          
              let datavariant = [];
          
              for (let i = 0; i < budget.length; i++) {
      
                for (let j = 0; j < budget[i].variant.length; j++) {
                    
                    let data = {
                      variant_id:budget[i].variant[j].variant_id
                    }
      
                    datavariant.push(data);
                  
                
                }
              }

              await request.query(`DELETE FROM proposal_variant WHERE proposal_id=${proposal_id}`);
              let proposal_variant = _.uniqBy(datavariant,'variant_id');
              for (let i = 0; i < proposal_variant.length; i++) {
      
                let variant_id = proposal_variant[i].variant_id;
                let proposal_variant_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalVariant = `INSERT INTO proposal_variant
                (proposal_variant_id,proposal_id, variant_id, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_variant_id}, ${proposal_id}, ${variant_id}, '${created_by}',now(),'${created_by}',now())`;
                await request.query(insertProposalVariant);
      
              }
      
              await request.query(`DELETE FROM proposal_distributor WHERE proposal_id=${proposal_id}`);
              for (let i = 0; i < distributor.length; i++) {
      
                let distributor_id = distributor[i].distributor_id;
                let proposal_distributor_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let insertProposalDistributor = `INSERT INTO proposal_distributor
                (proposal_distributor_id, proposal_id, distributor_id, created_by, created_date, updated_by, updated_date)
                VALUES(${proposal_distributor_id}, ${proposal_id}, ${distributor_id},'${created_by}',now(),'${created_by}',now())`;
                await request.query(insertProposalDistributor);
      
      
              }
              
              await request.query(`DELETE FROM proposal_budget_variant WHERE proposal_id=${proposal_id}`);
              await request.query(`DELETE FROM proposal_budget WHERE proposal_id=${proposal_id}`);
              for (let i = 0; i < budget.length; i++) {
      
                let proposal_budget_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                let activity_id = budget[i].activity_code;
                let branch_code = budget[i].branch_code;
                let brand_code = budget[i].brand_code;
                let totalbudget = budget[i].budgettoapprove;
                let nilaiso = budget[i].nilai_so ? budget[i].nilai_so : 0 ;
      
                let insertProposalBudget = `INSERT INTO proposal_budget
                (proposal_budget_id, proposal_id, activity_id, branch_code, 
                brand_code, budget, 
                created_by, created_date, updated_by, updated_date,nilai_so)
                VALUES(${proposal_budget_id}, ${proposal_id}, '${activity_id}', '${branch_code}', 
                '${brand_code}',${totalbudget}, 
                '${created_by}',now(),'${created_by}',now(),${nilaiso})`;
                await request.query(insertProposalBudget);
                
                for (let j = 0; j < budget[i].variant.length; j++) {
                  
                
                  let variant_id = budget[i].variant[j].variant_id;
                  let proposal_budget_variant_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                  let insertProposalBudgetVariant = `INSERT INTO proposal_budget_variant
                  (proposal_budget_variant_id, proposal_budget_id, proposal_id, variant_id, created_by, created_date, updated_by, updated_date)
                  VALUES(${proposal_budget_variant_id}, ${proposal_budget_id}, ${proposal_id}, '${variant_id}','${created_by}',now(),'${created_by}',now())`;
                  await request.query(insertProposalBudgetVariant);
                  
                }
          
              }
                  
              let sqlgetbudgetgroup = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total,proposal_budget.brand_code,brand_desc,activity_code,activity_desc,group_id 
              FROM proposal_budget LEFT JOIN activity ON proposal_budget.activity_id = activity.activity_code 
              LEFT JOIN m_brand ON proposal_budget.brand_code = m_brand.brand_code WHERE proposal_id = '${proposal_id}' 
              GROUP BY proposal_budget.brand_code,activity.group_id`;
      
              let dataapprovalbudgetgroup = await request.query(sqlgetbudgetgroup);
              let budgetgroup = dataapprovalbudgetgroup[0];

              let active = 0;
              let companyfilter = ``;
              if(budget_year==2020){
                active = 0;
                companyfilter = `AND activity.company_id='${company_id}'`
              }else{
                active = 1;
              }
          
              for (let i = 0; i < budgetgroup.length; i++) {
                    
                let diajukan = budgetgroup[i].total;
                let brand_code = budgetgroup[i].brand_code;
                let activity_code = budgetgroup[i].activity_code;
  


                let sqlgetbudgetactivity = `SELECT SUM(budget) as total,m_group.group_name,m_brand.brand_desc 
                FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
                LEFT JOIN m_group ON budget.group_id = m_group.id_group 
                LEFT JOIN m_activity activity ON m_group.id_group = activity.group_id AND activity.active=${active} AND activity.year = '${budget_year}'
                WHERE activity.activity_code = '${activity_code}' 
                ${companyfilter}
                AND budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;


    
                let databudgetactivity = await request.query(sqlgetbudgetactivity);
                let budgetactivity = databudgetactivity[0][0];
                let budgetbrand = Number(budgetactivity.total);
    
    
    

                let sqlgetbudgetperactivity = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
                INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
                LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.active=${active} AND activity.year = '${budget_year}'
                WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}' 
                AND proposal.status_id = 30
                ${companyfilter}
                AND activity.group_id = (SELECT group_id FROM m_activity activity WHERE activity_code = '${activity_code}' 
                AND activity.year = '${budget_year}' AND active=${active} ${companyfilter})`;
        

                console.log(sqlgetbudgetperactivity);
    
    
                let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
                let budgetperactivity = databudgetperactivity[0][0];
                let terpakai = Number(budgetperactivity.total);
    
    
                let sisa = budgetbrand - terpakai;
                let total_balance = sisa;
    
                let balance = 0;
                if( total_balance < 0 ) {
                    balance = 0;
                } else {
                    balance = total_balance;
                }

                console.log('diajukan ',diajukan);
                console.log('balance ',balance);
    
                if( diajukan >  balance ) {
        
                  errMessage.push(`Jumlah Budget yang di ajukan (${diajukan}) pada brand ${brand_code} Dengan Activity ${activity_code}  melebihi nilai balance (${balance})`);               

                } 
              
            }
    

            //await request.query(`DELETE FROM proposal_file WHERE proposal_id=${proposal_id}`);
            for (let i = 0; i < fileList.length; i++) {
              let file = fileList[i].name;
              let sqlInsertProposalFile = `INSERT INTO proposal_file
              (proposal_id, file, created_by, created_date, updated_by, updated_date)
              VALUES(${proposal_id}, '${file}','${created_by}',now(),'${created_by}',now())`;
              await request.query(sqlInsertProposalFile);
    
            }
            
          
            if(errMessage.length > 0 ){
          
              await request.query(`DELETE FROM proposal WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_email_distributor WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_executor WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_branch WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_activity WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_market WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_variant WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_distributor WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_budget WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_budget_variant WHERE proposal_id='${proposal_id}'`);
              await request.query(`DELETE FROM proposal_file WHERE proposal_id='${proposal_id}'`);

              return res.error({
                message: errMessage.toString()
              });
            }else{
              return res.success({
                result: proposal_id,
                message: "Edit data successfully"
            });
          }
          
        } catch (err) {
          return res.error(err);
        }
    
          })
      },

      addFiles: async function (req, res) {
        // console.log('tess req body', req.body.created_by)
        const {
          proposal_id,created_by
        } = JSON.parse(req.body.document);  //di bungkus dalam key document seperti biasa ya yas 
        let fileList = [] // nanti list file yg di upload akan ada di dalam variable ini
        //console.log('test', proposal_id,created_by)
        const generatedID = proposal_id+''; //variable genereatedID dipakai untuk sub folder file tersimpan
        //console.log(status_id);
        var uploadFile = req.file("file");
          uploadFile.upload({maxBytes: 500000000000000},
            async function onUploadComplete(err, files) {
              if (err) {
                let errMsg = err.message
                return res.error(errMsg)
              }
              // console.log('files', files)
              let noFile = 0
              for (const file of files) {
                noFile++
                //isi variable fileList dengan file yg di upload user
                //console.log('file.filename ???', file.filename)
                fileList.push({
                      uid: noFile,
                      name: file.filename,
                      status: 'done',
                      url: ''
                })
                //console.log('filename', file.filename) 
                fs.mkdirSync(dokumentPath( 'dokumenproposal', generatedID), {
                  recursive: true
                })
                const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename) + '*')
                if (filesamaDir.found.length > 0) {
                    //console.log('isexist file nama sama', filesamaDir.found[0])
                    fs.unlinkSync(filesamaDir.found[0])
                }
                fs.renameSync(file.fd, path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename))
              } 
    
              //Logic DB
              try {
                const request = await DBPROP.promise();

                for (let i = 0; i < fileList.length; i++) {
  
  
                  let file = fileList[i].name;
                  let sqlInsertProposalFile = `INSERT INTO proposal_file
                  (proposal_id, file, created_by, created_date, updated_by, updated_date)
                  VALUES(${proposal_id}, '${file}','${created_by}',now(),'${created_by}',now())`;
                  await request.query(sqlInsertProposalFile);
        
                }

                return res.success({
                  result: proposal_id,
                  message: "Add File successfully"
              });
        
                } catch (err) {
                return res.error(err);
              }
    
          })
      }

}