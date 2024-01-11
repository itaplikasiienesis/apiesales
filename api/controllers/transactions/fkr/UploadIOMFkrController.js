const path = require('path');
const _ = require('lodash');
const glob = require("glob");
const fs = require('fs');
const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);

module.exports = {

    uploadFileIomFKR: async function (req, res) {

        console.log(JSON.parse(req.body.document));

        const {fkr_id} = JSON.parse(req.body.document);
        await DB.poolConnect;
        const request = DB.pool.request();
        res.setTimeout(0);
            req.file('file_iom')
            .upload({
              maxBytes: 150000000
            }, async function whenDone(err, uploadedFileIom) {
                if (err) {
                  console.log('err excel', err)
                  return res.error(err);
                }
                if (uploadedFileIom.length === 0) {          
                  return res.error([], 'Tidak ada file yang diupload!');
                }

                console.log('uploadedFileIom ',uploadedFileIom);
                console.log('Upload IOM ',fkr_id);

                try {

                    let finalFormatName = '';
                    for (const file of uploadedFileIom) {
                        filenames = file.filename;
                        fs.mkdirSync(dokumentPath('fkr_iom', fkr_id), {
                        recursive: true,
                        });
                        const filesamaDir = glob.GlobSync(
                        path.resolve(
                            dokumentPath('fkr_iom', fkr_id),
                            file.filename.replace(/\.[^/.]+$/, "")
                        ) + "*"
                        );
                        if (filesamaDir.found.length > 0) {
                        fs.unlinkSync(filesamaDir.found[0]);
                        }
                        let formatFile = filenames.split('.').pop();
                        finalFormatName = 'fkr_iom.'+formatFile;

                        
                        fs.renameSync(
                        file.fd,
                        path.resolve(dokumentPath('fkr_iom', fkr_id), finalFormatName)
                        );
                    }

                    let updateData = `UPDATE fkr SET doc_dtb4 = '${finalFormatName}'
                    WHERE fkr_id = '${fkr_id}'`;
                    await request.query(updateData);


                return res.success({
                    message: 'Upload file berhasil'
                });
                    
                } catch (error) {
                    return res.error({
                        message: 'Upload file Gagal'
                    });

                }
            
            });
    
    
      }
  
}