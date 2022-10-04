"use strict";

const fs = require("fs");
const PO = require("pofile");

main();

async function main() {
    const countries = JSON.parse(await fs.promises.readFile("./build/countries.json", "utf-8"));
    const ui_keys = JSON.parse(await fs.promises.readFile("./build/ogs-ui-keys.json", "utf-8"));
    const languages = JSON.parse(await fs.promises.readFile("./languages.json", "utf-8"));

    for (let lang in languages) {
        console.log(`Processing ${lang}`);
        let conv = lang.replace(/([a-z]+)-([a-zA-Z]+)/, (_, a, b) => `${a}_${b.toUpperCase()}`);
        const po = await asyncLoadPoFile(`./locale/${conv}.po`);

        let result = {};
        for (let item of po.items) {
            let key = item.msgctxt ? item.msgctxt + "\x04" : "";
            key += item.msgid;
            if (item.msgid_plural) {
                key += "\x05" + item.msgid_plural;
            }
            if (!(key in ui_keys)) {
                continue;
            }

            let skip = false;
            for (let msg of item.msgstr) {
                if (msg.trim() === "") {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                result[key] = item.msgstr;
            }
        }

        let json = JSON.stringify(result);

        let country_map = {};
        for (let cc in countries["en"]) {
            country_map[cc] = countries["en"][cc];
        }
        let lang_countries = countries[lang] || {};
        for (var cc in lang_countries) {
            country_map[cc] = lang_countries[cc];
        }
        let country_json = JSON.stringify(country_map);

        await fs.promises.writeFile(
            `./locale/${lang}.js`,
            `window.ogs_languages = ${JSON.stringify(languages)};\n` +
                `(window.ogs_locales = window.ogs_locales || {})['${lang}'] = ${json};\n` +
                `(window.ogs_countries = window.ogs_countries || {})['${lang}'] = ${country_json};\n`,
        );
    }
}

async function asyncLoadPoFile(filename) {
    return new Promise((resolve, reject) => {
        PO.load(filename, (err, po) => {
            if (err) {
                reject(err);
            } else {
                resolve(po);
            }
        });
    });
}

main()
    .then(() => console.log("Done"))
    .catch((err) => console.log(err));
