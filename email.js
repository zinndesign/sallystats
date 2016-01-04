#!/var/node/bin/node
var nodemailer = require("nodemailer");

var generator = require('xoauth2').createXOAuth2Generator({
	user: "zinndesign@gmail.com",
	clientId: "389266937492-5gb2lg2qkn07l3a81fq3tg3ostn04b0r.apps.googleusercontent.com",
	clientSecret: "xa7gLSKuWtf4LVgZY-8QHD9i",
	refreshToken: "1/LrKrl8jdUb_T_WaSDdG9VmuAmr1iTOjOHXMVrHWU0RE"
});

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		xoauth2: generator
	}
});

var message = {
	from: "zinndesign@gmail.com",
	to: "zinndesign@gmail.com",
	subject: "Testing nodemailer",
	text: "Hello world"
}

transporter.sendMail(message, function(error, response) {
	if(error) {
		console.log(error);
	} else {
		console.log("Message sent: " + response.message);
	}
});