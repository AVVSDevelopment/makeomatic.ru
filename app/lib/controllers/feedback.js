(function() {
  var _, cache, config, credentials, fs, mailOptions, nodemailer, smtpPool, transport;

  nodemailer = require('nodemailer');

  smtpPool = require('nodemailer-smtp-pool');

  _ = require('lodash');

  credentials = require('../../smtp.json');

  fs = require('fs');

  config = {
    logger: true,
    maxConnections: 2,
    maxMessages: 1000,
    rateLimit: 1,
    service: 'yandex',
    auth: credentials
  };

  transport = nodemailer.createTransport(smtpPool(config));

  mailOptions = {
    from: "Feedback robot <" + credentials.user + ">",
    to: "getstarted@makeomatic.ru"
  };

  cache = {
    phones: {}
  };

  exports.brief = function(req, res) {
    var cachedPhone, data, email, errors, name, phone, qqfile, question, ref, subject, text;
    ref = req.body, name = ref.name, phone = ref.phone, email = ref.email, question = ref.question;
    if (req.files != null) {
      qqfile = req.files.qqfile;
    }
    errors = [];
    if (name.length < 4) {
      errors.push(res.__("Укажите Ваше имя и фамилию"));
    }
    if ((cachedPhone = phone.replace(/\D/g, "")).length < 11) {
      errors.push(res.__("Укажите ваш номер полностью"));
    }
    if (errors.length > 0) {
      return res.json({
        success: false,
        errors: errors
      }, 400);
    }
    subject = "Запрос звонка от " + name;
    text = "Имя: " + name + "\n\nТелефон: " + phone + "\n\nE-mail: " + email + "\n\nВопрос: " + question;
    data = _.extend({
      subject: subject,
      text: text
    }, mailOptions);
    if (qqfile != null) {
      data.attachments = [
        {
          fileName: qqfile.name,
          streamSource: fs.createReadStream(qqfile.path),
          contentType: qqfile.type
        }
      ];
    }
    return transport.sendMail(data, function(err, response) {
      if (err != null) {
        console.error(err);
        return res.json({
          success: false,
          err: "Непредвиденная ошибка сервера"
        }, 500);
      }
      return res.json({
        success: true
      });
    });
  };

}).call(this);
