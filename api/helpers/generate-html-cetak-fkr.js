const fs = require('fs')
const path = require('path')

module.exports = {

    friendlyName: 'Generate HTML Email Template',
  
  
    description: 'Return Generate HTML Email Template',
  
  
    inputs: {
  
      htmltemplate: {
        type: 'string',
        example: 'cmotemplate',
        description: 'The name of template.',
        required: true
      },
      templateparam: {
        type: 'ref',
        example: '{ nama: "husen", umur: 25 }',
        description: 'Template Parameter.',
        required: false
      }
  
    },
  
  
    fn: async function (inputs, exits) {
        let template = fs.readFileSync(path.join(sails.config.appPath, 'assets', 'report','fkr', `${inputs.htmltemplate}.html`), 'utf8')

        _.forOwn(inputs.templateparam, function(value, key) { 
            // console.log('>',value, key)
            template = template.replace(`@${key}@`, value)
        } );
        
      var result = template.toString();
      return exits.success(result);
    }
  
  };