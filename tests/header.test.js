const puppeteer = require('puppeteer');

let browser, page;

//Allow each test more than the default 5 seconds
jest.setTimeout(20000);

beforeEach(async () => {
	browser = await puppeteer.launch({
		headless: false
	});
	page = await browser.newPage();
	await page.goto('localhost:3000');
});

afterEach(async () => {
	await browser.close();
});

test('The header has correct text', async () => {
	const text = await page.$eval('a.brand-logo', el => el.innerHTML);
	expect(text).toEqual('Blogster');
});

test('Clicking login starts oauth flow', async () => {
	await page.click('.right a');
	const url = await page.url();
	console.log(url);
	expect(url).toMatch(/accounts\.google\.com/);
});


test.only('When signed in, shows logout button', async () => {
	//Simulate an oauth login and check for a logout button
	const id = '5dd4649616aafb4d8acc343e';
	const Buffer = require('safe-buffer').Buffer;
	const sessionObject = {
		passport: {
			user: id
		}
	};
	//Create a base64 string from the user
	const sessionString = Buffer.from(JSON.stringify(sessionObject)).toString('base64');

	//Load environment variables from .env
	require('dotenv').config()
	const { cookieKey } = require('../config/keys');

	//Sign the sessionString with the secret key
	const Keygrip = require('keygrip');
	const keygrip = new Keygrip([cookieKey]);
	const sig = keygrip.sign('express:sess=' + sessionString);
	//console.log('sessionString:', sessionString);
	//console.log('sig:', sig);
	
	//Must be navigated to the page before setting the cookie. That way, the cookie is associated 
	//with the page. But this is already done in the beforeEach
	await page.setCookie({
		name: 'express:sess',
		value: sessionString
	});
	await page.setCookie({
		name: 'express:sess.sig',
		value: sig
	});
	await page.goto('localhost:3000');

	//Wait for button to load before testing it
	await page.waitFor('a[href="/auth/logout"]');
	const text = await page.$eval('a[href="/auth/logout"]', el => el.innerHTML );

	expect(text).toEqual('Logout');

});