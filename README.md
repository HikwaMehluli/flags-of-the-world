# 🌍 Flags of the World Memory Game 🌍

![Flags of the World Memory Game Screenshot](./img/seo-image.jpg)

## An exciting and educational journey across the globe!

This project was born out of a desire to make learning about the world's diverse cultures an engaging experience for everyone.

This memory game is more than just a game; it's an adventure that will test your knowledge and teach you about the beautiful flags of countries and regions from different continents. Get ready to challenge your memory, learn some geography, and have a blast doing it!

## ✨ Features & Tech Stack

-   🎮 **Interactive Gameplay:** A classic memory game with a modern twist. 3 difficulty levels. Top 10 Scores.
-   🌐 **HTML5 & CSS3:** No bloated ~~CSS Frameworks~~ this is purely custom built with the latest web standards for a smooth and responsive experience.
-   💻 **JavaScript:** Powers the game's logic and interactivity.
-   🗂️ **JSON:** Manages the flag and country data for easy updates.

## 🎲 Game Play + Extras

When playing on regions with fewer countries than the selected difficulty level expects, the game intelligently supplements with flags from other regions within the same continent to ensure game completion. For example, if you select "North America" (which has only 5 countries) on "Hard" difficulty (which expects 10 pairs), the game will combine flags from North America with flags from other American regions to create the required 10 pairs. A notification will appear to inform you when flags from multiple regions are being combined. This ensures that you can enjoy the game on any continent or region, regardless of the number of countries available in that specific region.

## 📚 Libraries & Frameworks

-   🚩 **Flag Icons:** A fantastic collection of SVG flags from [Flag Icons](https://flagicons.lipis.dev/).
-   💡 **Tippy.js:** For beautiful and accessible tooltips. [Tippy.JS](https://atomiks.github.io/tippyjs)

### 💻 Development Dependencies

To set up the development environment, you'll need to install the following dependencies:

-   **Sass:** A CSS pre-processor.
-   **Webpack:** A module bundler.
-   **Webpack-CLI:** Command line interface for Webpack.

You can install them using npm:

```bash
# Install development dependencies
npm install --save-dev sass webpack webpack-cli
```

Once installed, you can run the following commands to build the CSS and JavaScript:

```bash
# Build CSS
npm run css-build

# Build JavaScript
npm run js-build
```

## 🗺️ Regions Included

The game includes flags from various continents: Africa, Europe, Asia, and the Americas.

### Africa

The countries and their flags are based on the official [Regions of the African Union](https://au.int/en/member_states/countryprofiles2). The African Union (AU) is made up of 55 Member States which represent all the countries on the African continent. AU Member States are divided into five geographic regions.

-   **North Africa:** Egypt (eg), Libya (ly), Tunisia (tn), Algeria (dz), Morocco (ma), Sudan (sd)
-   **Southern Africa:** South Africa (za), Zimbabwe (zw), Botswana (bw), Namibia (na), Zambia (zm), Lesotho (ls), Eswatini (sz), Malawi (mw)
-   **East Africa:** Kenya (ke), Ethiopia (et), Tanzania (tz), Uganda (ug), Rwanda (rw), Burundi (bi), Somalia (so), Djibouti (dj)
-   **West Africa:** Nigeria (ng), Ghana (gh), Senegal (sn), Mali (ml), Burkina Faso (bf), Ivory Coast (ci), Guinea (gn), Sierra Leone (sl), Liberia (lr), Togo (tg), Benin (bj)
-   **Central Africa:** Cameroon (cm), Chad (td), Central African Republic (cf), Gabon (ga), Equatorial Guinea (gq), Republic of Congo (cg), Democratic Republic of Congo (cd), Angola (ao)

### Europe

Includes countries and regions across the European continent.

-   **Northern Europe:** Aland Islands (ax), Denmark (dk), Estonia (ee), Faroe Islands (fo), Finland (fi), Guernsey (gg), Iceland (is), Ireland (ie), Isle of Man (im), Jersey (je), Latvia (lv), Lithuania (lt), Norway (no), Svalbard and Jan Mayen (sj), Sweden (se), United Kingdom (gb)
-   **Western Europe:** Austria (at), Belgium (be), France (fr), Germany (de), Liechtenstein (li), Luxembourg (lu), Monaco (mc), Netherlands (nl), Switzerland (ch)
-   **Southern Europe:** Albania (al), Andorra (ad), Bosnia and Herzegovina (ba), Croatia (hr), Cyprus (cy), Gibraltar (gi), Greece (gr), Holy See (va), Italy (it), Malta (mt), Montenegro (me), North Macedonia (mk), Portugal (pt), San Marino (sm), Serbia (rs), Slovenia (si), Spain (es), Türkiye (tr)
-   **Eastern Europe:** Belarus (by), Bulgaria (bg), Czech Republic (cz), Hungary (hu), Kosovo (xk), Moldova (md), Poland (pl), Romania (ro), Russia (ru), Slovakia (sk), Ukraine (ua)

### Asia

Includes countries and regions across the Asian continent.

-   **Central Asia:** Kazakhstan (kz), Kyrgyzstan (kg), Tajikistan (tj), Turkmenistan (tm), Uzbekistan (uz)
-   **Eastern Asia:** China (cn), Hong Kong (hk), Macao (mo), Japan (jp), Mongolia (mn), North Korea (kp), South Korea (kr), Taiwan (tw)
-   **South-Eastern Asia:** Brunei (bn), Cambodia (kh), Indonesia (id), Laos (la), Malaysia (my), Myanmar (mm), Philippines (ph), Singapore (sg), Thailand (th), Timor-Leste (tl), Vietnam (vn)
-   **Southern Asia:** Afghanistan (af), Bangladesh (bd), Bhutan (bt), India (in), Iran (ir), Maldives (mv), Nepal (np), Pakistan (pk), Sri Lanka (lk)
-   **Western Asia:** Armenia (am), Azerbaijan (az), Bahrain (bh), Cyprus (cy), Georgia (ge), Iraq (iq), Israel (il), Jordan (jo), Kuwait (kw), Lebanon (lb), Oman (om), Palestine (ps), Qatar (qa), Saudi Arabia (sa), Syria (sy), Turkey (tr), United Arab Emirates (ae), Yemen (ye)

### America

Includes countries and regions across North, Central, and South America.

-   **Northern America:** Bermuda (bm), Canada (ca), Greenland (gl), Saint Pierre and Miquelon (pm), United States (us)
-   **Caribbean:** Anguilla (ai), Antigua and Barbuda (ag), Aruba (aw), Bahamas (bs), Barbados (bb), Bonaire (bq), British Virgin Islands (vg), Cayman Islands (ky), Cuba (cu), Curaçao (cw), Dominica (dm), Dominican Republic (do), Grenada (gd), Guadeloupe (gp), Haiti (ht), Jamaica (jm), Martinique (mq), Montserrat (ms), Puerto Rico (pr), Saint Barthélemy (bl), Saint Kitts and Nevis (kn), Saint Lucia (lc), Saint Martin (mf), Saint Vincent and the Grenadines (vc), Sint Maarten (sx), Trinidad and Tobago (tt), Turks and Caicos Islands (tc), U.S. Virgin Islands (vi)
-   **Central America:** Belize (bz), Costa Rica (cr), El Salvador (sv), Guatemala (gt), Honduras (hn), Mexico (mx), Nicaragua (ni), Panama (pa)
-   **South America:** Argentina (ar), Bolivia (bo), Brazil (br), Chile (cl), Colombia (co), Ecuador (ec), Falkland Islands (fk), French Guiana (gf), Guyana (gy), Paraguay (py), Peru (pe), Suriname (sr), Uruguay (uy), Venezuela (ve)

---

## 📜 License

```
MIT License

Copyright (c) 2025 Hikwa Mehluli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```