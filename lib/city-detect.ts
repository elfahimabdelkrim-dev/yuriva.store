// lib/city-detect.ts
// City detection for the single "المدينة والعنوان" field.
// City reference: delivery company file VILLE CATHEDIS.xlsx
// (536 unique cities, column CITIES) + Arabic/Darija aliases for major cities.
// Server-side use (/api/orders). Detection NEVER blocks an order.

// canonical city -> normalized aliases (first alias = normalized canonical)
const CITY_ALIASES: Record<string, string[]> = {
  "Adiss": ["adiss"],
  "Afourer": ["afourer"],
  "Agadir": ["agadir", "اكادير", "اڭادير"],
  "Agafay": ["agafay"],
  "Agdz": ["agdz"],
  "Aghbalou": ["aghbalou"],
  "Aghil Esnos": ["aghil esnos"],
  "Aghmat": ["aghmat"],
  "Aghrgoub": ["aghrgoub"],
  "Aglou": ["aglou"],
  "Agouim": ["agouim"],
  "Agourai": ["agourai"],
  "Aguelmouss": ["aguelmouss"],
  "Ahfir": ["ahfir"],
  "Ain Aicha": ["ain aicha"],
  "Ain Allah": ["ain allah"],
  "Ain Attiq": ["ain attiq"],
  "Ain Beida": ["ain beida"],
  "Ain Beni Mathar": ["ain beni mathar"],
  "Ain Chebak": ["ain chebak"],
  "Ain Cheggag": ["ain cheggag"],
  "Ain Chkef": ["ain chkef"],
  "Ain Defali": ["ain defali"],
  "Ain Dorij": ["ain dorij"],
  "Ain El Aouda": ["ain el aouda", "ain aouda", "عين عوده"],
  "Ain El Orma": ["ain el orma"],
  "Ain Erreggada": ["ain erreggada"],
  "Ain Harrouda": ["ain harrouda", "عين حروده"],
  "Ain Jirri": ["ain jirri"],
  "Ain Kansara": ["ain kansara"],
  "Ain Karma": ["ain karma"],
  "Ain Mediouna - Taounate": ["ain mediouna taounate"],
  "Ain Sbit": ["ain sbit"],
  "Ain Taoujdate": ["ain taoujdate", "عين تاوجطات"],
  "Ain Zzabda": ["ain zzabda"],
  "Ait Amira": ["ait amira"],
  "Ait Baha": ["ait baha"],
  "Ait Belkacem": ["ait belkacem"],
  "Ait Ben Hado": ["ait ben hado"],
  "Ait Iazza": ["ait iazza"],
  "Ait Ishaq": ["ait ishaq"],
  "Ait Kamra": ["ait kamra"],
  "Ait Melloul": ["ait melloul", "ايت ملول"],
  "Ait Moussa-agadir": ["ait moussa agadir"],
  "Ait Ourir": ["ait ourir", "ايت اورير"],
  "Ait Yaazem": ["ait yaazem"],
  "Ajdir-al Hoceima": ["ajdir al hoceima"],
  "Ajdir-taza": ["ajdir taza"],
  "Akchour": ["akchour"],
  "Akka": ["akka"],
  "Akka Ighane": ["akka ighane"],
  "Akka Iguirene": ["akka iguirene"],
  "Aklim": ["aklim"],
  "Aknoul-taza": ["aknoul taza"],
  "Al Aaroui": ["al aaroui"],
  "Al Hoceima": ["al hoceima", "الحسيمه"],
  "Al Ismailia": ["al ismailia"],
  "Almina": ["almina"],
  "Amazraou": ["amazraou"],
  "Amizmizz": ["amizmizz", "amizmiz", "امزميز"],
  "Amsa": ["amsa"],
  "Amskroud": ["amskroud"],
  "Amtar": ["amtar"],
  "Ancienne Essaouira": ["ancienne essaouira"],
  "Anza": ["anza"],
  "Aoufous-errachidia": ["aoufous errachidia"],
  "Aoulouz": ["aoulouz"],
  "Aourir": ["aourir"],
  "Arbaoua-chefchaouen": ["arbaoua chefchaouen"],
  "Arekmane": ["arekmane"],
  "Asilah": ["asilah", "اصيله"],
  "Asjen": ["asjen"],
  "Aslofen": ["aslofen"],
  "Asni": ["asni"],
  "Assa-guelmim": ["assa guelmim"],
  "Assoul": ["assoul"],
  "Azemmour": ["azemmour", "ازمور"],
  "Azenti": ["azenti"],
  "Azilal": ["azilal"],
  "Azla": ["azla"],
  "Azrou": ["azrou", "ازرو"],
  "Azzaba - Sefrou": ["azzaba sefrou"],
  "Bab Berred": ["bab berred"],
  "Bab Marzouka-taza": ["bab marzouka taza"],
  "Bab Tilouan": ["bab tilouan"],
  "Babe Taza": ["babe taza"],
  "Barrio Chino": ["barrio chino"],
  "Bedouza": ["bedouza"],
  "Bejaad": ["bejaad"],
  "Belfaa": ["belfaa"],
  "Ben Ahmed-settat R": ["ben ahmed settat r"],
  "Ben Guerir": ["ben guerir", "ابن جرير", "بن جرير"],
  "Ben Khlil": ["ben khlil"],
  "Ben Taieb": ["ben taieb"],
  "Beni Chiker": ["beni chiker"],
  "Beni Mellal": ["beni mellal", "بني ملال"],
  "Beni Oual": ["beni oual"],
  "Beni Oulid": ["beni oulid"],
  "Beni Tadjit-oujda": ["beni tadjit oujda"],
  "Beni Yakhlef": ["beni yakhlef"],
  "Beni Zoli": ["beni zoli"],
  "Benslimane": ["benslimane", "بن سليمان", "بنسليمان"],
  "Berkane": ["berkane", "بركان"],
  "Berrechid": ["berrechid", "برشيد"],
  "Bhalil": ["bhalil"],
  "Biogra": ["biogra"],
  "Bir Jdid": ["bir jdid", "بير جديد"],
  "Bni Ahmed Gharbia": ["bni ahmed gharbia"],
  "Bni Amart (j+2)": ["bni amart j 2"],
  "Bni Assem": ["bni assem"],
  "Bni Ayat-beni Mellal": ["bni ayat beni mellal"],
  "Bni Bouayach (j+1)": ["bni bouayach j 1"],
  "Bni Boufrah (j+2)": ["bni boufrah j 2"],
  "Bni Drar": ["bni drar"],
  "Bni Hdifa (j+2)": ["bni hdifa j 2"],
  "Bni Khloug-settat R": ["bni khloug settat r"],
  "Bni Nsar": ["bni nsar"],
  "Bou Ahmed": ["bou ahmed"],
  "Bouadel": ["bouadel"],
  "Bouarfa": ["bouarfa"],
  "Bouarg": ["bouarg"],
  "Bouchane-kettara": ["bouchane kettara"],
  "Bouderbala": ["bouderbala"],
  "Bouderoua": ["bouderoua"],
  "Boudnib-errachidia": ["boudnib errachidia"],
  "Boufekrane": ["boufekrane"],
  "Bouhouda": ["bouhouda"],
  "Bouizakarne": ["bouizakarne"],
  "Boujdour": ["boujdour", "بوجدور"],
  "Boujniba": ["boujniba"],
  "Boukidarne (j+1)": ["boukidarne j 1"],
  "Boulanouare-khouribga": ["boulanouare khouribga"],
  "Boulaouane-settat R": ["boulaouane settat r"],
  "Boulemane": ["boulemane", "بولمان"],
  "Boumalne Dades": ["boumalne dades"],
  "Boumia": ["boumia"],
  "Bounaamane-tiznit": ["bounaamane tiznit"],
  "Bouskoura": ["bouskoura", "بوسكوره"],
  "Bouznika": ["bouznika", "بوزنيقه"],
  "Bouzoug-agadir": ["bouzoug agadir"],
  "Bridia": ["bridia"],
  "Brikcha": ["brikcha"],
  "Cabo Negro": ["cabo negro"],
  "Cafemaure": ["cafemaure"],
  "Casablanca": ["الدار البيضاء", "الدارالبيضاء", "دار البيضاء", "casablanca", "كازابلانكا", "البيضاء", "casa", "كازا"],
  "Chefchaouen": ["chefchaouen", "الشاون", "شفشاون"],
  "Chellalat": ["chellalat"],
  "Chemaia": ["chemaia"],
  "Cherafat": ["cherafat"],
  "Chichaoua": ["chichaoua", "شيشاوه"],
  "Chmaala": ["chmaala"],
  "Chouiter": ["chouiter"],
  "Chrifia": ["chrifia"],
  "Crona": ["crona"],
  "Dakhla": ["الداخله", "dakhla"],
  "Dar Akobaa": ["dar akobaa"],
  "Dar Gueddari-sidi Kacem": ["dar gueddari sidi kacem"],
  "Dar Kebdani": ["dar kebdani"],
  "Dar Oum Soltane": ["dar oum soltane"],
  "Darbouazza": ["dar bouazza", "darbouazza", "دار بوعزه"],
  "Dchira": ["dchira"],
  "Demnate": ["demnate", "دمنات"],
  "Derdara": ["derdara"],
  "Deroua": ["deroua"],
  "Dkhissa": ["dkhissa"],
  "Dlalha": ["dlalha"],
  "Douar Belaagid": ["douar belaagid"],
  "Douar Chlouh": ["douar chlouh"],
  "Douar Lakhtatba": ["douar lakhtatba"],
  "Douar Laqsir": ["douar laqsir"],
  "Douiyat - Fes": ["douiyat fes"],
  "Drarga": ["drarga"],
  "Driouech": ["driouech"],
  "El Aioun Sidi Mellouk": ["el aioun sidi mellouk"],
  "El Amine-tetouan": ["el amine tetouan"],
  "El Annasser": ["el annasser"],
  "El Arjate": ["el arjate"],
  "El Assa": ["el assa"],
  "El Attaouia": ["el attaouia"],
  "El Baraka": ["el baraka"],
  "El Borj": ["el borj"],
  "El Borouj-settat R": ["el borouj settat r"],
  "El Gara": ["el gara"],
  "El Hajeb": ["el hajeb", "الحاجب"],
  "El Harhoura": ["el harhoura"],
  "El Jadida": ["el jadida", "الجديده", "جديده"],
  "El Jebha": ["el jebha"],
  "El Jorf - Errachidia": ["el jorf errachidia"],
  "El Khemis Des Ait Ouahi": ["el khemis des ait ouahi"],
  "El Khemis El Metouh-settat R": ["el khemis el metouh settat r"],
  "El Ksiba": ["el ksiba"],
  "El Maader El Kabir-tiznit": ["el maader el kabir tiznit"],
  "El Mansouria": ["el mansouria", "المنصوريه"],
  "El Menzeh": ["el menzeh"],
  "El Menzel - Sefrou": ["el menzel sefrou"],
  "El Ouatia": ["el ouatia"],
  "El Ouidane": ["el ouidane"],
  "El Qbab": ["el qbab"],
  "Erfoud": ["erfoud"],
  "Errachidia": ["errachidia", "الراشيديه", "الرشيديه"],
  "Errahma": ["errahma"],
  "Essaouira": ["essaouira", "الصويره"],
  "Fam Al Hisn-tata": ["fam al hisn tata"],
  "Farkhana": ["farkhana"],
  "Fes": ["fes", "fez", "فاس"],
  "Fezouane": ["fezouane"],
  "Figuig": ["figuig"],
  "Fnideq": ["الفنيدق", "fnideq"],
  "Foum El Oued-laayoune": ["foum el oued laayoune"],
  "Foum Jamaa-azilal": ["foum jamaa azilal"],
  "Foum Zguid": ["foum zguid"],
  "Fquih Ben Salah": ["fquih ben salah", "fkih ben salah", "الفقيه بن صالح"],
  "Fricha - Taounate": ["fricha taounate"],
  "Galaz - Taounate": ["galaz taounate"],
  "Gfifet-taroudant": ["gfifet taroudant"],
  "Ghafsai": ["ghafsai"],
  "Ghazoua": ["ghazoua"],
  "Goulmima": ["goulmima"],
  "Guelmim": ["guelmim", "كلميم", "گلميم"],
  "Guenfouda": ["guenfouda"],
  "Guercif": ["guercif", "جرسيف", "گرسيف"],
  "Guigou": ["guigou"],
  "Guisser-settat R": ["guisser settat r"],
  "Had Bouhssoussen": ["had bouhssoussen"],
  "Had Hrara": ["had hrara"],
  "Had Kourt-ouazzane": ["had kourt ouazzane"],
  "Had Soualem": ["had soualem", "حد السوالم"],
  "Haj Kaddour": ["haj kaddour"],
  "Hajria": ["hajria"],
  "Hattane-khouribga": ["hattane khouribga"],
  "Hed Ouled Frej": ["hed ouled frej"],
  "Ibn Yaakoub": ["ibn yaakoub"],
  "Ifrane": ["ifrane", "افران"],
  "Ighram Laalam": ["ighram laalam"],
  "Ighrem Nougdal": ["ighrem nougdal"],
  "Imi Ouaddar": ["imi ouaddar"],
  "Imintanoute": ["imintanoute"],
  "Imouzzer Kandar": ["imouzzer kandar"],
  "Imouzzer Marmoucha": ["imouzzer marmoucha"],
  "Imsouane": ["imsouane"],
  "Imzouren (j+1)": ["imzouren j 1"],
  "Inzegane": ["inezgane", "inzegane", "انزكان", "انزگان"],
  "Issafn": ["issafn"],
  "Issaguen (j+2)": ["issaguen j 2"],
  "Itzer-midelt": ["itzer midelt"],
  "Jaadar": ["jaadar"],
  "Jamaa Houderrane": ["jamaa houderrane"],
  "Jemaat Shaim": ["jemaat shaim"],
  "Jerada": ["jerada", "جراده"],
  "Jerf-agadir": ["jerf agadir"],
  "Jmaat Fdalate": ["jmaat fdalate"],
  "Jnane Nich": ["jnane nich"],
  "Jorf El Melha": ["jorf el melha"],
  "Jorf Lasfer": ["jorf lasfer"],
  "Kaa Asras": ["kaa asras"],
  "Kabila-tetouan": ["kabila tetouan"],
  "Kahf Nsour": ["kahf nsour"],
  "Kalaat M'gouna": ["kalaat m gouna"],
  "Kantra El Ascar": ["kantra el ascar"],
  "Kariat Arkmane": ["kariat arkmane"],
  "Kariat Ba Mohamed": ["kariat ba mohamed"],
  "Kasbah Moulay Ismail": ["kasbah moulay ismail"],
  "Kasbat Sidi Abdellah Ben Mbarek": ["kasbat sidi abdellah ben mbarek"],
  "Kasbat Tadla": ["kasbat tadla", "kasba tadla", "قصبه تادله"],
  "Kassita": ["kassita"],
  "Kelâa Des Sraghna": ["el kelaa des sraghna", "kelaa des sraghna", "kelaa sraghna", "قلعه السراغنه"],
  "Kenitra": ["القنيطره", "kenitra", "لقنيطره", "قنيطره"],
  "Kettara": ["kettara"],
  "Khamis": ["khamis"],
  "Khemis Zemamra": ["khemis zemamra"],
  "Khemisset": ["khemisset", "الخميسات"],
  "Khenichet": ["khenichet"],
  "Khenifra": ["khenifra", "خنيفره"],
  "Khlalfa": ["khlalfa"],
  "Khmiss M'diq": ["khmiss m diq"],
  "Khouribga": ["khouribga", "خريبكه", "خريبگه"],
  "Koudia Baida-taroudant": ["koudia baida taroudant"],
  "Ksar L'kbir": ["ksar el kebir", "القصر الكبير", "ksar l kbir", "ksar kbir"],
  "Ksar Sghir": ["ksar sghir"],
  "Laaroumiate": ["laaroumiate"],
  "Laatamna": ["laatamna"],
  "Laayayda": ["laayayda"],
  "Laayoune": ["laayoune", "العيون"],
  "Laayoune-port": ["laayoune port"],
  "Lagouassem": ["lagouassem"],
  "Lahri": ["lahri"],
  "Lala Mimouna": ["lala mimouna"],
  "Lalla Fatna": ["lalla fatna"],
  "Lalla Takerkoust": ["lalla takerkoust"],
  "Lamnabeha": ["lamnabeha"],
  "Laouamra-larache": ["laouamra larache"],
  "Laqliaâ": ["laqliaa"],
  "Larache": ["larache", "العرايش"],
  "Loudaya": ["loudaya"],
  "Louizia": ["louizia"],
  "Loulad Fini": ["loulad fini"],
  "M'hamid El Ghizlane": ["m hamid el ghizlane"],
  "Maaziz": ["maaziz"],
  "Madagh": ["madagh"],
  "Marina Smir-tetouan": ["marina smir tetouan"],
  "Mariwari": ["mariwari"],
  "Marrakech": ["marrakech", "marrakesh", "مراكش"],
  "Martil": ["martil", "مرتيل"],
  "Masmouda": ["masmouda"],
  "Massa": ["massa"],
  "Matras": ["matras"],
  "Mdaghra-errachidia": ["mdaghra errachidia"],
  "Mechraa Belksiri": ["mechra bel ksiri", "mechraa belksiri", "مشرع بلقصيري"],
  "Medieq": ["medieq", "المضيق", "mdiq"],
  "Mediouna": ["mediouna", "مديونه"],
  "Mehdia-kenitra": ["mehdia kenitra"],
  "Mejjat": ["mejjat"],
  "Meknes": ["meknes", "مكناس"],
  "Mernissa": ["mernissa"],
  "Merzouga": ["merzouga"],
  "Mezlafen": ["mezlafen"],
  "Mghila": ["mghila"],
  "Mhaya": ["mhaya"],
  "Midar": ["midar"],
  "Midelt": ["midelt", "ميدلت"],
  "Mirleft": ["mirleft"],
  "Missour": ["missour", "ميسور"],
  "Moha Ou Cherif": ["moha ou cherif"],
  "Mohammadia": ["mohammadia", "mohammedia", "المحمديه", "محمديه"],
  "Moqrisset": ["moqrisset"],
  "Moulay Abdellah": ["moulay abdellah"],
  "Moulay Bouazza": ["moulay bouazza"],
  "Moulay Bousselham": ["moulay bousselham"],
  "Moulay Brahim": ["moulay brahim"],
  "Moulay Idriss Zerhoun": ["moulay idriss zerhoun"],
  "Moulay Yaacoub": ["moulay yaacoub", "moulay yacoub", "مولاي يعقوب"],
  "Mqam Tolba": ["mqam tolba"],
  "Mrirt": ["mrirt"],
  "Mzouda": ["mzouda"],
  "Mzoudia": ["mzoudia"],
  "Nador": ["الناضور", "الناظور", "nador", "ناظور"],
  "Nkob-zagora": ["nkob zagora"],
  "Nouaceur": ["nouaceur", "النواصر"],
  "Nzalat Laadam": ["nzalat laadam"],
  "Ouahat Sidi Brahim": ["ouahat sidi brahim"],
  "Oualidia": ["oualidia"],
  "Ouaouizeght (j+1)": ["ouaouizeght j 1"],
  "Ouargui": ["ouargui"],
  "Ouarqui": ["ouarqui"],
  "Ouarzazate": ["ouarzazate", "ورزازات"],
  "Ouazzane": ["ouazzane", "ouezzane", "وزان"],
  "Oued Amlil": ["oued amlil"],
  "Oued Cherat": ["oued cherat"],
  "Oued Jdida": ["oued jdida"],
  "Oued Laou": ["oued laou"],
  "Oued Zem": ["oued zem", "وادي زم", "واد زم"],
  "Ouisslan": ["ouisslan"],
  "Oujda": ["oujda", "وجده"],
  "Oulad Hamou-larache": ["oulad hamou larache"],
  "Oulad Jerar-tiznit": ["oulad jerar tiznit"],
  "Oulad Said El Oued": ["oulad said el oued"],
  "Oulad Said-settat R": ["oulad said settat r"],
  "Oulad Settout": ["oulad settout"],
  "Oulad Tayeb": ["oulad tayeb"],
  "Oulad Youssef": ["oulad youssef"],
  "Oulad Zmam-beni Mellal": ["oulad zmam beni mellal"],
  "Ouled Ayad": ["ouled ayad"],
  "Ouled Belkhir": ["ouled belkhir"],
  "Ouled Ben Rahmoun -beni Mellal": ["ouled ben rahmoun beni mellal"],
  "Ouled Berhil": ["ouled berhil"],
  "Ouled Dahou-agadir": ["ouled dahou agadir"],
  "Ouled Daoud - Taounate": ["ouled daoud taounate"],
  "Ouled Ghadbane": ["ouled ghadbane"],
  "Ouled Ghanem": ["ouled ghanem"],
  "Ouled Hassoune": ["ouled hassoune"],
  "Ouled Jelloul": ["ouled jelloul"],
  "Ouled Mbarek-beni Mellal": ["ouled mbarek beni mellal"],
  "Ouled Saleh": ["ouled saleh"],
  "Ouled Teima": ["ouled teima"],
  "Ouled Zidouh": ["ouled zidouh"],
  "Oulmes": ["oulmes"],
  "Oum El Guerdane": ["oum el guerdane"],
  "Ounagha": ["ounagha"],
  "Ounnana": ["ounnana"],
  "Ourika": ["ourika"],
  "Ourtzagh - Taounate": ["ourtzagh taounate"],
  "Outat El Haj": ["outat el haj"],
  "Qrimda-larache": ["qrimda larache"],
  "Quaà Asserasse": ["quaa asserasse"],
  "Rabat": ["الرباط", "rabat", "رباط"],
  "Ras Ain Rhamna": ["ras ain rhamna"],
  "Ras El Ain": ["ras el ain"],
  "Ras El Ain-settat R": ["ras el ain settat r"],
  "Ras Lma": ["ras lma"],
  "Ribate El Kheir": ["ribate el kheir"],
  "Rich": ["rich"],
  "Rissani": ["rissani"],
  "Rommani": ["rommani"],
  "Safi": ["safi", "اسفي"],
  "Sahel Boutaher - Taounate": ["sahel boutaher taounate"],
  "Sahel-larache": ["sahel larache"],
  "Saidia": ["saidia"],
  "Sala Al Jadida": ["sala al jadida"],
  "Salé": ["sale", "سلا"],
  "Sania Plage-tetouan": ["sania plage tetouan"],
  "Sbaa Ayoune": ["sbaa ayoune"],
  "Sbit – Tit Mellil": ["sbit tit mellil"],
  "Sebt Ben Sassi": ["sebt ben sassi"],
  "Sebt Gzoula": ["sebt gzoula"],
  "Sebt Jahjouh": ["sebt jahjouh"],
  "Sebt Lgerdan": ["sebt lgerdan"],
  "Sebt Mtiwa": ["sebt mtiwa"],
  "Sefrou": ["sefrou", "صفرو"],
  "Sekoura": ["sekoura"],
  "Selouane": ["selouane"],
  "Senhaja - Sefrou": ["senhaja sefrou"],
  "Settat": ["settat", "سطات"],
  "Sgangan": ["sgangan"],
  "Sid L'mokhtar": ["sid l mokhtar"],
  "Sidi Abbad": ["sidi abbad"],
  "Sidi Abdelah Ghiat": ["sidi abdelah ghiat"],
  "Sidi Abderrazzak Khzazna": ["sidi abderrazzak khzazna"],
  "Sidi Abed": ["sidi abed"],
  "Sidi Aissa-beni Mellal": ["sidi aissa beni mellal"],
  "Sidi Allal El Bahraoui": ["sidi allal el bahraoui", "سيدي علال البحراوي"],
  "Sidi Allal Tazi": ["sidi allal tazi"],
  "Sidi Bennour": ["sidi bennour", "سيدي بنور"],
  "Sidi Bibi": ["sidi bibi"],
  "Sidi Bou Othmane": ["sidi bou othmane"],
  "Sidi Bousber": ["sidi bousber"],
  "Sidi Bouzid": ["sidi bouzid"],
  "Sidi Bouzid-safi": ["sidi bouzid safi"],
  "Sidi El Aidi-settat R": ["sidi el aidi settat r"],
  "Sidi Hajjaj": ["sidi hajjaj"],
  "Sidi Harazem": ["sidi harazem"],
  "Sidi Ifni": ["sidi ifni", "سيدي افني"],
  "Sidi Jaber-beni Mellal": ["sidi jaber beni mellal"],
  "Sidi Kacem": ["sidi kacem", "سيدي قاسم"],
  "Sidi Laidi": ["sidi laidi"],
  "Sidi Rahal": ["sidi rahal", "سيدي رحال"],
  "Sidi Redouane": ["sidi redouane"],
  "Sidi Slimane": ["sidi slimane", "سيدي سليمان"],
  "Sidi Smail": ["sidi smail"],
  "Sidi Taybi": ["sidi taybi"],
  "Sidi Yahya Lgharb": ["sidi yahya el gharb", "sidi yahya lgharb", "سيدي يحيي الغرب"],
  "Sidi Yahya Zaer-rabat": ["sidi yahya zaer rabat"],
  "Sidi Zouine": ["sidi zouine"],
  "Skhirat": ["الصخيرات", "skhirat"],
  "Skhour Rehamna": ["skhour rehamna"],
  "Skoura": ["skoura"],
  "Smara": ["السماره", "smara"],
  "Souihla": ["souihla"],
  "Souiria-safi": ["souiria safi"],
  "Souk Al Had": ["souk al had"],
  "Souk El Gour": ["souk el gour"],
  "Souk Laarbaa Du Gharb": ["souk laarbaa du gharb", "souk el arbaa", "سوق الاربعاء", "souk larbaa", "سوق اربعاء"],
  "Souk Laarbaa Essohoul": ["souk laarbaa essohoul"],
  "Souk Sebt Ouled Nemma": ["souk sebt ouled nemma"],
  "Souk Tnine Moghane": ["souk tnine moghane"],
  "Stihat": ["stihat"],
  "Taddart-agadir": ["taddart agadir"],
  "Taddart-taza": ["taddart taza"],
  "Tafersit": ["tafersit"],
  "Tafraoute": ["tafraoute"],
  "Taghazout": ["taghazout"],
  "Taghbalt": ["taghbalt"],
  "Taghrsa": ["taghrsa"],
  "Tagmoute": ["tagmoute"],
  "Tagounite": ["tagounite"],
  "Tagzirt-beni Mellal": ["tagzirt beni mellal"],
  "Tahala": ["tahala"],
  "Tahanaout": ["tahannaout", "tahanaout", "تحناوت"],
  "Tala Youssef": ["tala youssef"],
  "Taliouin": ["taliouin"],
  "Talmest": ["talmest"],
  "Tamallalt": ["tamallalt"],
  "Tamanart": ["tamanart"],
  "Tamaris 1": ["tamaris 1"],
  "Tamaris 2 (km 7)": ["tamaris 2 km 7"],
  "Tamegroute": ["tamegroute"],
  "Tamensourt": ["tamensourt"],
  "Tameslouht": ["tameslouht"],
  "Tamesna": ["tamesna", "تامسنا"],
  "Tamezmoute": ["tamezmoute"],
  "Tamraght": ["tamraght"],
  "Tamri-agadir": ["tamri agadir"],
  "Tamsaman": ["tamsaman"],
  "Tanant-azilal": ["tanant azilal"],
  "Tandiman": ["tandiman"],
  "Tanger": ["tangier", "tanger", "tanja", "طنجه"],
  "Tansikhte": ["tansikhte"],
  "Tantan": ["tan tan", "طان طان", "tantan", "طانطان"],
  "Taounate": ["taounate"],
  "Taourirt": ["taourirt", "تاوريرت"],
  "Taourirt Boucetta": ["taourirt boucetta"],
  "Targha": ["targha"],
  "Targuist (j+1)": ["targuist j 1"],
  "Taroudant": ["taroudant", "تارودانت"],
  "Tassift": ["tassift"],
  "Tassoultante": ["tassoultante"],
  "Tata": ["tata"],
  "Taza": ["taza", "تازه"],
  "Tazarine": ["tazarine"],
  "Tazenakht-ouarzazate": ["tazenakht ouarzazate"],
  "Taznakht": ["taznakht"],
  "Temara": ["temara", "تمارا", "تماره"],
  "Temsia": ["temsia"],
  "Tendrara": ["tendrara"],
  "Teroual-ouazzane": ["teroual ouazzane"],
  "Tetouan": ["tetouan", "tetuan", "تطوان"],
  "Thar Es-souk": ["thar es souk"],
  "Tidas": ["tidas"],
  "Tifelt": ["tifelt", "tiflet", "تيفلت"],
  "Tighssaline": ["tighssaline"],
  "Tignite": ["tignite"],
  "Tin Mansour-agadir": ["tin mansour agadir"],
  "Tindit": ["tindit"],
  "Tinejdad": ["tinejdad"],
  "Tinfou": ["tinfou"],
  "Tinghir": ["tinghir", "تنغير"],
  "Tinzouline": ["tinzouline"],
  "Tinzouline-zagora": ["tinzouline zagora"],
  "Tissa": ["tissa"],
  "Tissint": ["tissint"],
  "Titmellil": ["tit mellil", "titmellil", "تيط مليل"],
  "Tizi Ouasli-taza": ["tizi ouasli taza"],
  "Tiznit": ["tiznit", "تيزنيت"],
  "Tiztoutine": ["tiztoutine"],
  "Tlat Bougedra": ["tlat bougedra"],
  "Tnin Chtouka": ["tnin chtouka"],
  "Tnin Gharbia-safi": ["tnin gharbia safi"],
  "Youssoufia": ["youssoufia", "اليوسفيه"],
  "Zagora": ["zagora", "زاكوره", "زاگوره"],
  "Zaida": ["zaida"],
  "Zaio": ["zaio"],
  "Zaouiat Bougrine - Sefrou": ["zaouiat bougrine sefrou"],
  "Zaouiat Chikh": ["zaouiat chikh"],
  "Zghanghan": ["zghanghan"],
  "Zoumi": ["zoumi"],
  "Zrayeb": ["zrayeb"],
  "Zrizer": ["zrizer"],
};

/** Normalize Arabic/French text: lowercase, strip accents/diacritics, unify Arabic letters, remove punctuation. */
export function normalizeCityText(input: string): string {
  let s = String(input ?? "").toLowerCase().trim();
  // strip latin accents
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // unify arabic characters
  s = s
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627") // أ إ آ ٱ -> ا
    .replace(/\u0649/g, "\u064a")                        // ى -> ي
    .replace(/\u0626/g, "\u064a")                        // ئ -> ي
    .replace(/\u0624/g, "\u0648")                        // ؤ -> و
    .replace(/\u0629/g, "\u0647")                        // ة -> ه
    .replace(/[\u064b-\u065f\u0640]/g, "");             // diacritics + tatweel
  // punctuation -> space
  s = s.replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

// ── Neighborhood aliases ─────────────────────────────────────────────────────
// Matched ONLY when no explicit city / city alias is found in the text.
// Explicit city always wins over neighborhood.
// Values are normalized at module load (same normalizer as cities).
const NEIGHBORHOOD_ALIASES: Record<string, string[]> = {
  "Sale": [
    "hay karima sale", "hay karima salé", "hay karima",
    "حي كريمة سلا", "حي كريمة", "كريمة",
  ],
  "Casablanca": [
    "hay hassani", "حي الحسني",
    "ain diab", "عين الذئاب", "عين الذياب",
    "maarif", "المعاريف", "معاريف",
    "bernoussi", "sidi bernoussi", "البرنوصي", "سيدي البرنوصي",
    "sidi maarouf", "سيدي معروف",
    "hay salam casa", "حي السلام الدار البيضاء",
  ],
  "Tanger": [
    "beni makada", "بني مكادة",
  ],
  "Rabat": [
    "agdal", "اكدال", "أكدال",
  ],
};

interface AliasEntry {
  canonical: string;
  tokens: string[];                              // normalized alias words
  kind: "city" | "alias" | "neighborhood";
}

function buildEntries(
  source: Record<string, string[]>,
  kindOf: (canonical: string, alias: string) => "city" | "alias" | "neighborhood"
): AliasEntry[] {
  return Object.entries(source)
    .flatMap(([canonical, aliases]) =>
      aliases.map((a) => {
        const normalized = normalizeCityText(a);
        return {
          canonical,
          tokens: normalized.split(" ").filter(Boolean),
          kind: kindOf(canonical, normalized),
        };
      })
    )
    .filter((e) => e.tokens.length > 0)
    .sort((a, b) =>
      b.tokens.length - a.tokens.length ||
      b.tokens.join(" ").length - a.tokens.join(" ").length
    );
}

// Priority 1+2: explicit city names + city aliases (longest first)
const CITY_ENTRIES: AliasEntry[] = buildEntries(CITY_ALIASES, (canonical, alias) =>
  alias === normalizeCityText(canonical) ? "city" : "alias"
);

// Priority 3: neighborhoods (longest first) — used only if no city matched
const NEIGHBORHOOD_ENTRIES: AliasEntry[] = buildEntries(NEIGHBORHOOD_ALIASES, () => "neighborhood");

export interface CityDetectResult {
  city: string;                                       // canonical city ("" if not detected)
  address: string;                                    // remaining address text
  detected: boolean;
  matchedBy: "city" | "alias" | "neighborhood" | "none";
}

function findMatch(
  entries: AliasEntry[],
  originalWords: string[],
  normWords: string[]
): { entry: AliasEntry; start: number; length: number } | null {
  for (const entry of entries) {
    const t = entry.tokens;
    for (let i = 0; i + t.length <= normWords.length; i++) {
      let match = true;
      for (let j = 0; j < t.length; j++) {
        if (normWords[i + j] !== t[j]) { match = false; break; }
      }
      if (match) return { entry, start: i, length: t.length };
    }
  }
  return null;
}

/**
 * Detect a Moroccan city inside the free-text "المدينة والعنوان" field.
 *
 * Priority:
 *   1. explicit city name from the CATHEDIS list        (matchedBy: "city")
 *   2. city aliases (casa, الدار البيضاء, ...)            (matchedBy: "alias")
 *   3. neighborhood aliases (hay karima → Sale, ...)     (matchedBy: "neighborhood")
 *   4. fallback: not detected                            (matchedBy: "none")
 *
 * Explicit city ALWAYS wins over neighborhood:
 *   "Casablanca Hay Karima" → Casablanca (address keeps "Hay Karima")
 *   "Hay Karima rue 12"     → Sale       (address = "rue 12")
 *
 * NEVER throws — on any problem returns { detected: false, address: input }.
 */
export function detectCity(rawInput: string): CityDetectResult {
  const raw = String(rawInput ?? "").trim();
  if (!raw) return { city: "", address: raw, detected: false, matchedBy: "none" };

  try {
    const originalWords = raw.split(/[\s,\u060c;\u061b.\/|-]+/).filter(Boolean);
    const normWords     = originalWords.map((w) => normalizeCityText(w));

    // Priority 1 + 2: cities and city aliases
    const cityMatch = findMatch(CITY_ENTRIES, originalWords, normWords);
    if (cityMatch) {
      const { entry, start, length } = cityMatch;
      const remaining = [...originalWords.slice(0, start), ...originalWords.slice(start + length)]
        .join(" ").trim();
      return { city: entry.canonical, address: remaining, detected: true, matchedBy: entry.kind };
    }

    // Priority 3: neighborhoods (only when no explicit city was written)
    const hoodMatch = findMatch(NEIGHBORHOOD_ENTRIES, originalWords, normWords);
    if (hoodMatch) {
      const { entry, start, length } = hoodMatch;
      const remaining = [...originalWords.slice(0, start), ...originalWords.slice(start + length)]
        .join(" ").trim();
      return { city: entry.canonical, address: remaining, detected: true, matchedBy: "neighborhood" };
    }
  } catch { /* never block the order on detection issues */ }

  // Priority 4: fallback
  return { city: "", address: raw, detected: false, matchedBy: "none" };
}
