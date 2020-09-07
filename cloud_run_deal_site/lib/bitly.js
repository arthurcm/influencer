const request = require('request');

class Bitly {
    access_token = 'de13dfc4f7511a3fa3aaed0b5b0d7f7f09b4a63e';
    headers = {
        'Authorization': `Bearer ${this.access_token}`,
        'Content-Type': 'application/json'
    };

    generateShortLink(longUrl) {
        const requestOptions = {
            url: 'https://api-ssl.bitly.com/v4/shorten',
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                long_url: longUrl
            })
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (error, response, body) => {
                if (!error) {
                    resolve(JSON.parse(body));
                }
                reject(error)
            });
        })
    }
}

module.exports = new Bitly();