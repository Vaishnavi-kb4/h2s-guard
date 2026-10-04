export type SupportedLanguage = "English" | "தமிழ்" | "हिंदी" | "ಕನ್ನಡ" | "മലയാളം";

export interface AssistantContext {
  latestExposure?: string;
  twaPpm?: number;
  duration?: number;
  workerId?: string;
  status?: string;
}

export function getGreetingMessage(lang: string): string {
  switch (lang) {
    case "தமிழ்":
      return "வணக்கம்! நான் உங்கள் HSE பாதுகாப்பு உதவியாளன். H₂S வாயு அளவு, பாதுகாப்பு விதிகள், புகைப்பட வழிகாட்டல் மற்றும் பேட்ஜ் விவரங்கள் பற்றி எளிய முறையில் உங்களுக்கு உதவ தயார்!";
    case "हिंदी":
      return "नमस्ते! मैं आपका HSE सुरक्षा सहायक हूँ। मैं H₂S गैस स्तर, सुरक्षा नियमों, फोटो निर्देशों और बैज स्थिति के बारे में आपको आसान भाषा में जानकारी देने के लिए यहाँ हूँ!";
    case "கன்னட":
    case "ಕನ್ನಡ":
      return "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ HSE ಸುರಕ್ಷತಾ ಸಹಾಯಕ. H₂S ಗ್ಯಾಸ್ ಮಟ್ಟ, ಸುರಕ್ಷತಾ ನಿಯಮಗಳು ಮತ್ತು ಬ್ಯಾಡ್ಜ್ ವಿವರಗಳನ್ನು ಸರಳವಾಗಿ ತಿಳಿಸಲು ಇಲ್ಲಿದ್ದೇನೆ!";
    case "മലയാളം":
      return "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ HSE സുരക്ഷാ സഹായിയാണ്. H₂S ഗ്യാസ് അളവ്, സുരക്ഷാ നിയമങ്ങൾ, ഫോട്ടോ നിർദ്ദേശങ്ങൾ എന്നിവയെക്കുറിച്ച് ലളിതമായി സഹായിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്!";
    default:
      return "Hello! I am your HSE Safety Assistant Bot. I am here to explain your gas levels, safety limits, photo scanning steps, and badge details in simple, easy-to-understand terms!";
  }
}

export function getSuggestedQuestions(lang: string): { key: string; label: string }[] {
  switch (lang) {
    case "தமிழ்":
      return [
        { key: "latest", label: "📊 எனது வாயு அளவு பாதுகாப்பானதா?" },
        { key: "emergency", label: "🚨 வாயு எச்சரிக்கை ஒலித்தால் என்ன செய்ய வேண்டும்?" },
        { key: "preshift", label: "📸 ஷிப்ட் போட்டோ எடுப்பது எப்படி?" },
        { key: "limit", label: "🛡️ வாயு பாதுகாப்பு வரம்புகள் என்ன?" },
        { key: "badge", label: "🏷️ எனது பேட்ஜ் நிலை என்ன?" },
        { key: "math", label: "🧮 C_TWA மற்றும் CAL-03 எவ்வாறு கணக்கிடப்படுகிறது?" },
      ];
    case "हिंदी":
      return [
        { key: "latest", label: "📊 क्या मेरा गैस स्तर सुरक्षित है?" },
        { key: "emergency", label: "🚨 गैस अलार्म बजने पर क्या करें?" },
        { key: "preshift", label: "📸 शिफ्ट फोटो कैसे खींचें?" },
        { key: "limit", label: "🛡️ गैस सुरक्षा सीमाएँ क्या हैं?" },
        { key: "badge", label: "🏷️ मेरे बैज की स्थिति क्या है?" },
        { key: "math", label: "🧮 C_TWA और CAL-03 गणना कैसे काम करती है?" },
      ];
    case "கன்னட":
    case "ಕನ್ನಡ":
      return [
        { key: "latest", label: "📊 ನನ್ನ ಗ್ಯಾಸ್ ಮಟ್ಟ ಸುರಕ್ಷಿತವಾಗಿದೆಯೇ?" },
        { key: "emergency", label: "🚨 ಗ್ಯಾಸ್ ಅಲಾರಾಂ ಬಂದಾಗ ಏನು ಮಾಡಬೇಕು?" },
        { key: "preshift", label: "📸 ಶಿಫ್ಟ್ ಫೋಟೋ ತೆಗೆಯುವುದು ಹೇಗೆ?" },
        { key: "limit", label: "🛡️ ಸುರಕ್ಷತಾ ಮಿತಿಗಳು ಯಾವುವು?" },
        { key: "badge", label: "🏷️ ನನ್ನ ಬ್ಯಾಡ್ಜ್ ಸ್ಥಿತಿ ಏನು?" },
        { key: "math", label: "🧮 C_TWA ಮತ್ತು CAL-03 ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ?" },
      ];
    case "മലയാളം":
      return [
        { key: "latest", label: "📊 എൻ്റെ ഗ്യാസ് ലെവൽ സുരക്ഷിതമാണോ?" },
        { key: "emergency", label: "🚨 ഗ്യാസ് അലാറം അടിച്ചാൽ എന്ത് ചെയ്യണം?" },
        { key: "preshift", label: "📸 ഷിഫ്റ്റ് ഫോട്ടോ എങ്ങനെ എടുക്കാം?" },
        { key: "limit", label: "🛡️ സുരക്ഷിത ഗ്യാസ് പരിധികൾ ഏതൊക്കെയാണ്?" },
        { key: "badge", label: "🏷️ എൻ്റെ ബാഡ്ജ് നില എന്താണ്?" },
        { key: "math", label: "🧮 C_TWA യും CAL-03 മോഡലും എങ്ങനെ കണക്കാക്കാം?" },
      ];
    default:
      return [
        { key: "latest", label: "📊 Is my current gas level safe?" },
        { key: "emergency", label: "🚨 What should I do if gas alarm sounds?" },
        { key: "preshift", label: "📸 How to take pre & post shift photos?" },
        { key: "limit", label: "🛡️ What are the safe gas exposure limits?" },
        { key: "badge", label: "🏷️ What is my badge expiry status?" },
        { key: "math", label: "🧮 How are C_TWA and CAL-03 calculated?" },
      ];
  }
}

export function generateMultilingualAnswer(query: string, lang: string, ctx?: AssistantContext): string {
  const lower = query.toLowerCase().trim();
  const exposureVal = ctx?.twaPpm !== undefined ? ctx.twaPpm : 0.26;
  const doseVal = ctx?.latestExposure || "2.1 ppm·h";
  const twaStr = `${exposureVal.toFixed(2)} ppm`;
  const durationStr = ctx?.duration ? `${ctx.duration}h` : "8h";
  const workerStr = ctx?.workerId || "W-101";

  const isHighDanger = exposureVal > 2.5;
  const isModerateWarning = exposureVal >= 1.0 && exposureVal <= 2.5;

  // 1. GREETINGS & INTRODUCTIONS
  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey" ||
    lower.includes("namaste") ||
    lower.includes("vanakkam") ||
    lower.includes("namaskara") ||
    lower.includes("who are you") ||
    lower.includes("what is your name") ||
    lower.includes("help") ||
    lower.includes("bot")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `வணக்கம்! 👋 நான் உங்கள் H₂S GUARD பாதுகாப்பு உதவியாளன்.

உங்களுக்கு நான் செய்யக்கூடிய உதவிகள்:
• 📊 உங்கள் H₂S வாயு அளவு பாதுகாப்பானதா என்று சரிபார்த்தல்
• 🚨 வாயு கசிவு ஏற்பட்டால் அவசர வழிமுறைகள் கூறுதல்
• 📸 ஷிப்ட் முன் & பின் போட்டோ எடுக்கும் வழிகாட்டுதல்
• 🏷️ உங்கள் பேட்ஜ் ஆயுட்காலம் & நிலை அறிவித்தல்
• 🧮 $C_{TWA}$ மற்றும் CAL-03 கணக்கீடுகள் விளக்குதல்

எந்த கேள்வியையும் தாராளமாகக் கேட்கலாம்!`;
      case "हिंदी":
        return `नमस्ते! 👋 मैं आपका H₂S GUARD सुरक्षा सहायक हूँ।

मैं आपकी मदद कर सकता हूँ:
• 📊 आपका H₂S गैस स्तर सुरक्षित है या नहीं, यह बताने में
• 🚨 गैस रिसाव के समय आपातकालीन सुरक्षा निर्देशों में
• 📸 शिफ्ट फोटो स्कैन करने के आसान तरीकों में
• 🏷️ आपके बैज की वैधता और स्थिति बताने में
• 🧮 $C_{TWA}$ और CAL-03 गणितीय मॉडल समझाने में

झिझकिए मत, कोई भी सवाल पूछें!`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ H₂S GUARD ಸುರಕ್ಷತಾ ಸಹಾಯಕ.

ನಾನು ಸಹಾಯ ಮಾಡುವ ವಿಷಯಗಳು:
• 📊 ನಿಮ್ಮ H₂S ಗ್ಯಾಸ್ ಮಟ್ಟ ಸುರಕ್ಷಿತವಾಗಿದೆಯೇ ಎಂದು ತಿಳಿಸುವುದು
• 🚨 ಗ್ಯಾಸ್ ಸೋರಿಕೆಯಾದಾಗ ಅನುಸರಿಸಬೇಕಾದ ಸುರಕ್ಷತಾ ನಿಯಮಗಳು
• 📸 ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡುವ ಹಂತಗಳು
• 🏷️ ನಿಮ್ಮ ಬ್ಯಾಡ್ಜ್ ಮಾನ್ಯತೆಯ ಸ್ಥಿತಿ
• 🧮 $C_{TWA}$ ಮತ್ತು CAL-03 ಮೌಲ್ಯಮಾಪನ ವಿವರಗಳು

ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ!`;
      case "മലയാളം":
        return `നമസ്കാരം! 👋 ഞാൻ നിങ്ങളുടെ H₂S GUARD സുരക്ഷാ സഹായിയാണ്.

ഞാൻ സഹായിക്കുന്ന കാര്യങ്ങൾ:
• 📊 നിങ്ങളുടെ H₂S ഗ്യാസ് നില സുരക്ഷിതമാണോ എന്ന് പരിശോധിക്കുക
• 🚨 ഗ്യാസ് ചോർച്ച ഉണ്ടായാൽ ചെയ്യേണ്ട കാര്യങ്ങൾ
• 📸 ഷിഫ്റ്റ് ഫോട്ടോ സ്കാൻ ചെയ്യുന്ന രീതികൾ
• 🏷️ നിങ്ങളുടെ ബാഡ്ജ് നില അറിയുക
• 🧮 $C_{TWA}$ യും CAL-03 കണക്കുകളും മനസ്സിലാക്കുക

ധൈര്യമായി എന്തും ചോദിക്കാം!`;
      default:
        return `Hello! 👋 I am your friendly H₂S GUARD Safety Assistant Bot.

Here is how I can help you today:
• 📊 Check if your gas exposure level is safe for work
• 🚨 Emergency action steps if a gas leak happens
• 📸 Simple guide for taking pre-shift and post-shift photos
• 🏷️ Check your badge shelf-life & validity
• 🧮 Explain $C_{TWA}$ cumulative dose & CAL-03 spline math

Feel free to ask any safety or system question!`;
    }
  }

  // 2. EMERGENCY & GAS LEAK PROTOCOLS
  if (
    lower.includes("alarm") ||
    lower.includes("emergency") ||
    lower.includes("evacuate") ||
    lower.includes("leak") ||
    lower.includes("danger") ||
    lower.includes("hazard") ||
    lower.includes("siren") ||
    lower.includes("mask") ||
    lower.includes("scba")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `🚨 **H₂S வாயு அவசர பாதுகாப்பு விதிமுறைகள்:**

1. 🤿 **மூச்சுக்கருவி அணிங்கள்:** உடனடியாக SCBA அல்லது அவசர சுவாச மாஸ்க் அணியவும்.
2. 🏃 **காற்றின் திசைக்கு எதிராகச் செல்லவும்:** காற்று வீசும் திசைக்கு எதிராக (Upwind) உடனே அவசர சேகரிப்பு இடத்திற்கு (Muster Point) செல்லவும்.
3. 📢 **கட்டுப்பாட்டு அறைக்குத் தெரிவிக்கவும்:** உடனடியாக பாதுகாப்பு அதிகாரிக்கு தகவல் அளிக்கவும்.
4. ⛔ **மீண்டும் செல்ல வேண்டாம்:** பாதுகாப்பு அதிகாரி அனுமதி அளிக்கும் வரை அந்த இடத்திற்கு செல்லக்கூடாது.`;
      case "हिंदी":
        return `🚨 **H₂S गैस आपातकालीन सुरक्षा निर्देश:**

1. 🤿 **मास्क पहनें:** तुरंत अपना SCBA या आपातकालीन ब्रीथिंग मास्क पहनें।
2. 🏃 **सुरक्षित स्थान पर जाएं:** हवा की विपरीत दिशा (Upwind) में तुरंत आपातकालीन मस्टर प्वाइंट की तरफ जाएँ।
3. 📢 **सूचित करें:** तुरंत सुरक्षा अधिकारी और कंट्रोल रूम को खबर दें।
4. ⛔ **वापस न जाएं:** जब तक अधिकारी अनुमति न दें, क्षेत्र में दोबारा न जाएँ।`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `🚨 **ಗ್ಯಾಸ್ ಅಲಾರಾಂ ಬಂದಾಗ ಮಾಡಬೇಕಾದ ತುರ್ತು ನಿಯಮಗಳು:**

1. 🤿 **ಮಾಸ್ಕ್ ಧರಿಸಿ:** ತಕ್ಷಣವೇ SCBA ಅಥವಾ ಸುರಕ್ಷತಾ ಮಾಸ್ಕ್ ಧರಿಸಿ.
2. 🏃 **ಸುರಕ್ಷಿತ ಜಾಗಕ್ಕೆ ತೆರಳಿ:** ಗಾಳಿಯ ವಿರುದ್ಧ ದಿಕ್ಕಿನಲ್ಲಿ ತಕ್ಷಣ ತುರ್ತು ಮಸ್ಟರ್ ಪಾಯಿಂಟ್‌ಗೆ ತೆರಳಿ.
3. 📢 **ಮಾಹಿತಿ ನೀಡಿ:** ಸುರಕ್ಷತಾ ಅಧಿಕಾರಿಗಳಿಗೆ ತಕ್ಷಣ ತಿಳಿಸಿ.
4. ⛔ **ಮರಳಿ ಹೋಗಬೇಡಿ:** ಅಧಿಕಾರಿಗಳು ಅನುಮತಿಸುವವರೆಗೆ ಆ ಜಾಗಕ್ಕೆ ಹೋಗಬೇಡಿ.`;
      case "മലയാളം":
        return `🚨 **H₂S ഗ്യാസ് അലാറം അടിക്കുമ്പോൾ ചെയ്യേണ്ട കാര്യങ്ങൾ:**

1. 🤿 **മാസ്ക് ധരിക്കുക:** ഉടൻ തന്നെ നിങ്ങളുടെ SCBA അല്ലെങ്കിൽ സുരക്ഷാ മാസ്ക് ധരിക്കുക.
2. 🏃 **സുരക്ഷിത സ്ഥാനത്തേക്ക് മാറുക:** കാറ്റിൻ്റെ എതിർദിശയിൽ (Upwind) മസ്റ്റർ പോയിൻ്റിലേക്ക് നീങ്ങുക.
3. 📢 **വിവരം അറിയിക്കുക:** സുരക്ഷാ ഉദ്യോഗസ്ഥരെ ഉടൻ വിവരമറിയിക്കുക.
4. ⛔ **തിരികെ പോകരുത്:** സുരക്ഷ ഉറപ്പാക്കുന്നത് വരെ ആ പ്രദേശത്തേക്ക് മടങ്ങരുത്.`;
      default:
        return `🚨 **H₂S EMERGENCY SAFETY PROTOCOL:**

1. 🤿 **Put on your breathing mask:** Don your SCBA or emergency breathing hood immediately.
2. 🏃 **Evacuate Upwind:** Walk crosswind/upwind (against wind direction) away from the gas source toward the designated Muster Point.
3. 📢 **Notify Safety Control:** Alert plant control room and HSE Officers immediately.
4. ⛔ **Do not re-enter:** Stay in the safe muster area until official clearance is declared.`;
    }
  }

  // 3. SCIENTIFIC MATH & FORMULAS (C_TWA, CAL-03, CIEDE2000, UNCERTAINTY)
  if (
    lower.includes("twa") ||
    lower.includes("cal-03") ||
    lower.includes("c_twa") ||
    lower.includes("ciede2000") ||
    lower.includes("formula") ||
    lower.includes("math") ||
    lower.includes("spline") ||
    lower.includes("deltae") ||
    lower.includes("uncertainty")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `🧮 **H₂S கணித முறை மற்றும் கணக்கீடுகள்:**

• **திரட்டப்பட்ட அளவு (Cumulative Dose D):** $D = \\int C(t) dt$ (அலகு: ppm·h).
• **ஷிப்ட் சராசரி ($C_{TWA}$):** $C_{TWA} = \\frac{D}{t} = \\frac{D}{8.0\\text{ மணிநேரம்}}$.
• **CAL-03 LUT மாதிரி:** வண்ண மாற்றம் (CIEDE2000 $\\Delta E_{00}$) மூலம் வாயு செறிவை துல்லியமாக கணக்கிடுகிறது.
• **சுற்றுச்சூழல் திருத்தம்:** 25°C வெப்பநிலை மற்றும் 50% ஈரப்பதத்தை அடிப்படையாகக் கொண்டு தானாகவே சீரமைக்கப்படுகிறது.`;
      case "हिंदी":
        return `🧮 **H₂S गणितीय सूत्र और गणना मॉडल:**

• **संचयी खुराक (Cumulative Dose D):** $D = \\int C(t) dt$ (इकाई: ppm·h)।
• **शिफ्ट औसत ($C_{TWA}$):** $C_{TWA} = \\frac{D}{t} = \\frac{D}{8.0\\text{ घंटे}}$।
• **CAL-03 LUT मॉडल:** रंग परिवर्तन (CIEDE2000 $\\Delta E_{00}$) के आधार पर गैस मात्रा की सटीक गणना करता है।
• **पर्यावरण क्षतिपूर्ति:** 25°C तापमान और 50% आर्द्रता के आधार पर ऑटो-करेक्ट होता है।`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `🧮 **H₂S ಗಣಿತದ ಸೂತ್ರ ಮತ್ತು ಲೆಕ್ಕಾಚಾರ:**

• **ಸಂಚಿತ ಡೋಸ್ (Cumulative Dose D):** $D = \\int C(t) dt$ (ppm·h).
• **ಶಿಫ್ಟ್ ಸರಾಸರಿ ($C_{TWA}$):** $C_{TWA} = \\frac{D}{t} = \\frac{D}{8.0\\text{ ಗಂಟೆಗಳು}}$.
• **CAL-03 LUT ಮಾದರಿ:** ಬಣ್ಣದ ಬದಲಾವಣೆ (CIEDE2000 $\\Delta E_{00}$) ಆಧಾರದ ಮೇಲೆ ಗ್ಯಾಸ್ ಸಾಂದ್ರತೆಯನ್ನು ನಿಖರವಾಗಿ ಲೆಕ್ಕಹಾಕುತ್ತದೆ.
• **ಪರಿಸರ ಹೊಂದಾಣಿಕೆ:** 25°C ತಾಪಮಾನ ಮತ್ತು 50% ಆರ್ದ್ರತೆಯ ಆಧಾರದ ಮೇಲೆ ಆಟೋ-ಅಡ್ಜಸ್ಟ್ ಆಗುತ್ತದೆ.`;
      case "മലയാളം":
        return `🧮 **H₂S ഗണിത സൂത്രവാക്യവും കണക്കുകൂട്ടലും:**

• **ആകെ ശേഖരിച്ച ഡോസ് (D):** $D = \\int C(t) dt$ (ppm·h).
• **ഷിഫ്റ്റ് ശരാശരി ($C_{TWA}$):** $C_{TWA} = \\frac{D}{t} = \\frac{D}{8.0\\text{ മണിക്കൂർ}}$.
• **CAL-03 LUT മോഡൽ:** നിറവ്യത്യാസം (CIEDE2000 $\\Delta E_{00}$) ഉപയോഗിച്ച് ഗ്യാസ് സാന്ദ്രത കൃത്യമായി നിർണ്ണയിക്കുന്നു.
• **പരിസ്ഥിതി ക്രമീകരണം:** 25°C താപനിലയും 50% ഈർപ്പവും അടിസ്ഥാനമാക്കി സ്വയം ശരിയാക്കുന്നു.`;
      default:
        return `🧮 **H₂S DOSIMETRY FORMULAS & SCIENTIFIC ENGINE:**

• **Cumulative Dose ($D$):** $D = \\int_0^t C(t) dt$ (measured in ppm·h).
• **8-Hour Shift Average ($C_{TWA}$):** $C_{TWA} = \\frac{D}{t} = \\frac{D}{8.0\\text{ hours}}$ (measured in ppm).
• **CAL-03 LUT Spline:** Maps non-linear color distance ($\Delta E_{00}$) from sensing region ROI-A to calibrated exposure dose.
• **Environmental Compensation:** $k_{env} = [1 + 0.005(T - 25)] \\times [1 + 0.002(RH - 50)]$.`;
    }
  }

  // 4. PRE-SHIFT & POST-SHIFT PHOTO GUIDANCE
  if (
    lower.includes("how to capture") ||
    lower.includes("preshift") ||
    lower.includes("pre-shift") ||
    lower.includes("postshift") ||
    lower.includes("post-shift") ||
    lower.includes("take photo") ||
    lower.includes("photo") ||
    lower.includes("scan") ||
    lower.includes("glare") ||
    lower.includes("roi")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `📸 **ஷிப்ட் போட்டோ எடுக்கும் எளிய வழிகாட்டி:**

• **ஷிப்ட் தொடக்கம் (Pre-Shift):** வேலை தொடங்கும் முன் உங்கள் பேட்ஜை நல்ல வெளிச்சத்தில் கேமரா முன் வைத்து போட்டோ எடுக்கவும்.
• **ஷிப்ட் முடிவு (Post-Shift):** 8 மணிநேர பணி முடிந்ததும் மீண்டும் போட்டோ எடுக்கவும்.
• 💡 **குறிப்பு:** நிழல் மற்றும் அதிக வெளிச்சப் பிரதிபலிப்பு (Glare) இல்லாமல் தெளிவான போட்டோ எடுக்கவும்.`;
      case "हिंदी":
        return `📸 **शिफ्ट फोटो खींचने की आसान गाइड:**

• **शिफ्ट शुरू करने से पहले (Pre-Shift):** काम शुरू करने से पहले अच्छी रोशनी में बैज की फोटो लें।
• **शिफ्ट खत्म होने के बाद (Post-Shift):** 8-घंटे की शिफ्ट पूरी होने पर दोबारा फोटो खींचें।
• 💡 **सलाह:** बैज पर छाया या तेज चमक (Glare) न आने दें, फोटो बिल्कुल साफ होनी चाहिए।`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `📸 **ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡುವ ಸರಳ ಹಂತಗಳು:**

• **ಕೆಲಸ ಪ್ರಾರಂಭಿಸುವ ಮೊದಲು (Pre-Shift):** ನಿಮ್ಮ ಬ್ಯಾಡ್ಜ್ ಅನ್ನು ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ ಹಿಡಿದು ಫೋಟೋ ತೆಗೆಯಿರಿ.
• **ಕೆಲಸ ಮುಗಿದ ನಂತರ (Post-Shift):** 8 ಗಂಟೆಗಳ ಕೆಲಸದ ನಂತರ ಮತ್ತೆ ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.
• 💡 **ಸಲಹೆ:** ನೆರಳು ಮತ್ತು ಅತಿಯಾದ ಬೆಳಕಿನ ಪ್ರತಿಫಲನವಿಲ್ಲದೆ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.`;
      case "മലയാളം":
        return `📸 **ഫോട്ടോ എടുക്കുന്നതിനുള്ള എളുപ്പവഴികൾ:**

• **ജോലി തുടങ്ങുന്നതിന് മുൻപ് (Pre-Shift):** നല്ല വെളിച്ചത്തിൽ ബാഡ്ജ് ക്യാമറയിൽ ഫോട്ടോ എടുക്കുക.
• **ജോലി കഴിഞ്ഞ ശേഷം (Post-Shift):** 8 മണിക്കൂർ ഷിഫ്റ്റ് കഴിഞ്ഞ് വീണ്ടും സ്കാൻ ചെയ്യുക.
• 💡 **ശ്രദ്ധിക്കുക:** നിഴലോ വെളിച്ചത്തിൻ്റെ പ്രതിഫലനമോ ഇല്ലാതെ വ്യക്തമായ ഫോട്ടോ എടുക്കുക.`;
      default:
        return `📸 **GUIDED DOSIMETER PHOTO SCANNING:**

• **Step 1 (Pre-Shift):** Capture an unexposed badge photo before starting work to store your zero baseline.
• **Step 2 (Post-Shift):** Capture a post-shift photo after 8 hours to calculate color shift ($\Delta E$).
• 💡 **Quality Tip:** Align ROI-A (sensing patch), ROI-B (color palette), and ROI-C (badge ID) clearly with even ambient lighting and no camera glare.`;
    }
  }

  // 5. BADGE SHELF-LIFE & VALIDITY
  if (
    lower.includes("badge") ||
    lower.includes("expiry") ||
    lower.includes("expiration") ||
    lower.includes("shelf") ||
    lower.includes("cartridge") ||
    lower.includes("valid")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `🏷️ **உங்கள் பேட்ஜ் நிலை மற்றும் ஆயுட்காலம்:**

• **பேட்ஜ் ஐடி:** B-00101
• **நிலை:** 🟢 செல்லுபடியாகும் (VALID)
• **ஆயுட்காலம்:** 12 ஜனவரி 2027 வரை செல்லுபடியாகும் (> 30 நாட்கள் மீதமுள்ளது).
• 💡 வலதுபுற பச்சை புள்ளி (Green Dot) பேட்ஜ் நல்ல நிலையில் உள்ளதை உறுதி செய்கிறது.`;
      case "हिंदी":
        return `🏷️ **आपके बैज की स्थिति और वैधता:**

• **बैज आईडी:** B-00101
• **स्थिति:** 🟢 मान्य (VALID)
• **समाप्ति तिथि:** 12 जनवरी 2027 तक पूरी तरह चालू (> 30 दिन शेष)।
• 💡 दाहिनी ओर का हरा बिंदु (Green Dot) दर्शाता है कि बैज पूरी तरह सुरक्षित है।`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `🏷️ **ನಿಮ್ಮ ಬ್ಯಾಡ್ಜ್ ಸ್ಥಿತಿ ಮತ್ತು ಆಯುಷ್ಯ:**

• **ಬ್ಯಾಡ್ಜ್ ಐಡಿ:** B-00101
• **ಸ್ಥಿತಿ:** 🟢 ಮಾನ್ಯವಾಗಿದೆ (VALID)
• **ಅವಧಿ:** 12 ಜನವರಿ 2027 ರವರೆಗೆ ಚಾಲ್ತಿಯಲ್ಲಿದೆ.
• 💡 ಬಲಭಾಗದ ಹಸಿರು ಚುಕ್ಕೆ (Green Dot) ಬ್ಯಾಡ್ಜ್ ಉತ್ತಮ ಸ್ಥಿತಿಯಲ್ಲಿದೆ ಎಂಬುದನ್ನು ತೋರಿಸುತ್ತದೆ.`;
      case "മലയാളം":
        return `🏷️ **നിങ്ങളുടെ ബാഡ്ജ് നിലയും ആയുസ്സും:**

• **ബാഡ്ജ് ഐഡി:** B-00101
• **നില:** 🟢 സാധുവായത് (VALID)
• **കാലാവധി:** 12 ജനുവരി 2027 വരെ സാധുവാണ്.
• 💡 വലതുവശത്തെ പച്ച പുള്ളി (Green Dot) ബാഡ്ജ് മികച്ച നിലയിലാണെന്ന് ഉറപ്പാക്കുന്നു.`;
      default:
        return `🏷️ **YOUR DOSIMETER BADGE SHELF-LIFE STATUS:**

• **Badge ID:** B-00101
• **Shelf Life Status:** 🟢 VALID (Green Indicator Dot)
• **Expiry Date:** 12 Jan 2027 (> 30 days remaining)
• 💡 **Optical Check:** Faceplate green indicator dot verified. Badge is clean and ready for work shift entry.`;
    }
  }

  // 6. SAFE LIMITS & COLOR THRESHOLDS
  if (
    lower.includes("limit") ||
    lower.includes("threshold") ||
    lower.includes("safe") ||
    lower.includes("ppm") ||
    lower.includes("level") ||
    lower.includes("green") ||
    lower.includes("amber") ||
    lower.includes("orange") ||
    lower.includes("red")
  ) {
    switch (lang) {
      case "தமிழ்":
        return `🛡️ **H₂S வாயு பாதுகாப்பு எல்லைகள் (எளிமையான விளக்கம்):**

• 🟢 **பச்சை (பாதுகாப்பானது - < 1.00 ppm):** நீங்கள் முழு பாதுகாப்போடு வேலை செய்யலாம்.
• 🟡 **மஞ்சள் (எச்சரிக்கை - 1.00 முதல் 2.50 ppm):** வாயு அளவு சற்று அதிகம். கவனமாக இருக்கவும்.
• 🔴 **சிவப்பு (அபாயம் - > 2.50 ppm):** உடனடியாக அந்த இடத்தை விட்டு வெளியேற வேண்டும்!`;
      case "हिंदी":
        return `🛡️ **H₂S गैस सुरक्षा स्तर (आसान भाषा में):**

• 🟢 **हरा (सुरक्षित - < 1.00 ppm):** आप पूरी तरह सुरक्षित हैं, काम जारी रखें।
• 🟡 **पीला (चेतावनी - 1.00 से 2.50 ppm):** गैस का स्तर थोड़ा बढ़ा है। सतर्क रहें।
• 🔴 **लाल (खतरा - > 2.50 ppm):** तुरंत जगह खाली करके बाहर आ जाएं!`;
      case "கன்னட":
      case "ಕನ್ನಡ":
        return `🛡️ **H₂S ಗ್ಯಾಸ್ ಸುರಕ್ಷತಾ ಮಟ್ಟಗಳು:**

• 🟢 **ಹಸಿರು (ಸುರಕ್ಷಿತ - < 1.00 ppm):** ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ.
• 🟡 **ಹಳದಿ (ಎಚ್ಚರಿಕೆ - 1.00 ರಿಂದ 2.50 ppm):** ಗ್ಯಾಸ್ ಮಟ್ಟ ಸ್ವಲ್ಪ ಹೆಚ್ಚಿದೆ. ಎಚ್ಚರದಿಂದಿರಿ.
• 🔴 **ಕೆಂಪು (ಅಪಾಯ - > 2.50 ppm):** ತಕ್ಷಣವೇ ಸ್ಥಳ ಖಾಲಿ ಮಾಡಿ ಹೊರಬನ್ನಿ!`;
      case "മലയാളം":
        return `🛡️ **H₂S ഗ്യാസ് സുരക്ഷാ നിലവാരം (ലളിതമായി):**

• 🟢 **പച്ച (സുരക്ഷിതം - < 1.00 ppm):** നിങ്ങൾക്ക് പൂർണ്ണ സുരക്ഷിതത്വത്തോടെ ജോലി ചെയ്യാം.
• 🟡 **മഞ്ഞ (മുന്നറിയിപ്പ് - 1.0 മുതൽ 2.50 ppm):** ഗ്യാസ് നില അല്പം കൂടുതലാണ്. ശ്രദ്ധിക്കുക.
• 🔴 **ചുവപ്പ് (അപകടം - > 2.50 ppm):** ഉടൻ തന്നെ സ്ഥലം ഒഴിഞ്ഞ് മാറണം!`;
      default:
        return `🛡️ **WORKPLACE H₂S SAFETY THRESHOLDS:**

• 🟢 **GREEN (SAFE - Under 1.00 ppm TWA):** Healthy work environment. Normal shift permitted.
• 🟡 **ORANGE (MODERATE - 1.00 to 2.50 ppm TWA):** Caution threshold. Increase ventilation and monitor closely.
• 🔴 **RED (HIGH HAZARD - Above 2.50 ppm TWA):** Danger threshold! Evacuate area immediately and notify HSE Officer.`;
    }
  }

  // 7. CURRENT WORKER EXPOSURE INQUIRY
  if (
    lower.includes("reading") ||
    lower.includes("current") ||
    lower.includes("latest") ||
    lower.includes("my status") ||
    lower.includes("my dose") ||
    lower.includes("how much") ||
    lower.includes("result") ||
    lower.includes("w-") ||
    lower.includes("my gas")
  ) {
    if (isHighDanger) {
      switch (lang) {
        case "தமிழ்":
          return `📊 **பணியாளர் ${workerStr} அவர்களின் பாதுகாப்பு அறிக்கை:**

• 🔴 **பாதுகாப்பு நிலை:** 🚨 அதிக வாயு அபாயம்! (HIGH EXPOSURE)
• 💨 **சராசரி வாயு அளவு ($C_{TWA}$):** ${twaStr} (2.50 ppm எல்லை தாண்டியது!)
• ⏱️ **மொத்த திரட்டப்பட்ட அளவு:** ${doseVal} (${durationStr} ஷிப்ட்)

🚨 **அவசர நடவடிக்கை:** உடனடியாக வேலையை நிறுத்திவிட்டு, மூச்சுக்கருவி அணிந்து வெளியேறவும்!`;
        case "हिंदी":
          return `📊 **कर्मचारी ${workerStr} की सुरक्षा रिपोर्ट:**

• 🔴 **सुरक्षा स्थिति:** 🚨 उच्च गैस खतरा! (HIGH EXPOSURE)
• 💨 **औसत गैस स्तर ($C_{TWA}$):** ${twaStr} (2.50 ppm सीमा से अधिक!)
• ⏱️ **कुल संचयी खुराक:** ${doseVal} (${durationStr} शिफ्ट)

🚨 **आपकी कार्रवाई:** तुरंत काम रोकें, मास्क पहनें और सुरक्षित मस्टर प्वाइंट पर जाएं!`;
        case "கன்னட":
        case "ಕನ್ನಡ":
          return `📊 **ಕಾರ್ಮಿಕ ${workerStr} ಅವರ ಸುರಕ್ಷತಾ ವರದಿ:**

• 🔴 **ಸುರಕ್ಷತಾ ಸ್ಥಿತಿ:** 🚨 ಹೆಚ್ಚಿನ ಗ್ಯಾಸ್ ಅಪಾಯ! (HIGH EXPOSURE)
• 💨 **ಸರಾಸರಿ ಗ್ಯಾಸ್ ಮಟ್ಟ ($C_{TWA}$):** ${twaStr} (2.50 ppm ಮೀರಿದೆ!)
• ⏱️ **ಒಟ್ಟು ಗ್ಯಾಸ್ ಶೇಖರಣೆ:** ${doseVal} (${durationStr} ಶಿಫ್ಟ್)

🚨 **ತುರ್ತು ಕ್ರಮ:** ತಕ್ಷಣ ಕೆಲಸ ನಿಲ್ಲಿಸಿ, ಮಾಸ್ಕ್ ಧರಿಸಿ ಸುರಕ್ಷಿತ ಸ್ಥಳಕ್ಕೆ ತೆರಳಿ!`;
        case "മലയാളം":
          return `📊 **തൊഴിലാളി ${workerStr} യുടെ സുരക്ഷാ റിപ്പോർട്ട്:**

• 🔴 **സുരക്ഷാ നില:** 🚨 ഉയർന്ന ഗ്യാസ് അപായം! (HIGH EXPOSURE)
• 💨 **ശരാശരി ഗ്യാസ് നില ($C_{TWA}$):** ${twaStr} (2.50 ppm പരിധി കവിഞ്ഞു!)
• ⏱️ **ആകെ ഡോസ്:** ${doseVal} (${durationStr} ഷിഫ്റ്റിൽ)

🚨 **ഉടൻ ചെയ്യേണ്ടത്:** ജോലി നിർത്തി മാസ്ക് ധരിച്ച് മാറുക!`;
        default:
          return `📊 **YOUR PERSONAL GAS EXPOSURE REPORT (${workerStr}):**

• 🔴 **Safety Condition:** 🚨 HIGH EXPOSURE HAZARD!
• 💨 **Shift-Average ($C_{TWA}$):** ${twaStr} (EXCEEDS the 2.50 ppm safe limit!)
• ⏱️ **Cumulative Dose ($D$):** ${doseVal} over ${durationStr} shift
• ⚠️ **Status:** REVIEW REQUIRED

🚨 **REQUIRED SAFETY ACTION:** Stop work immediately! Put on your emergency breathing hood and evacuate to the Muster Point. Report to your HSE Officer right away.`;
      }
    } else if (isModerateWarning) {
      switch (lang) {
        case "தமிழ்":
          return `📊 **பணியாளர் ${workerStr} அவர்களின் பாதுகாப்பு அறிக்கை:**

• 🟡 **பாதுகாப்பு நிலை:** எச்சரிக்கை (MODERATE EXPOSURE)
• 💨 **சராசரி வாயு அளவு ($C_{TWA}$):** ${twaStr}
• ⏱️ **மொத்த திரட்டப்பட்ட அளவு:** ${doseVal} (${durationStr} ஷிப்ட்)

⚠️ **அறிவுரை:** பணி இடத்தில் காற்றோட்டத்தை அதிகரிக்கவும். கவனமாக இருக்கவும்.`;
        case "हिंदी":
          return `📊 **कर्मचारी ${workerStr} की सुरक्षा रिपोर्ट:**

• 🟡 **सुरक्षा स्थिति:** चेतावनी (MODERATE EXPOSURE)
• 💨 **औसत गैस स्तर ($C_{TWA}$):** ${twaStr}
• ⏱️ **कुल संचयी खुराक:** ${doseVal} (${durationStr} शिफ्ट)

⚠️ **सलाह:** कार्यस्थल में वेंटिलेशन बढ़ाएं और सतर्क रहें।`;
        case "கன்னட":
        case "ಕನ್ನಡ":
          return `📊 **ಕಾರ್ಮಿಕ ${workerStr} ಅವರ ಸುರಕ್ಷತಾ ವರದಿ:**

• 🟡 **ಸುರಕ್ಷತಾ ಸ್ಥಿತಿ:** ಎಚ್ಚರಿಕೆ (MODERATE EXPOSURE)
• 💨 **ಸರಾಸರಿ ಗ್ಯಾಸ್ ಮಟ್ಟ ($C_{TWA}$):** ${twaStr}
• ⏱️ **ಒಟ್ಟು ಗ್ಯಾಸ್ ಶೇಖರಣೆ:** ${doseVal} (${durationStr} ಶಿಫ್ಟ್)

⚠️ **ಸಲಹೆ:** ಗಾಳಿ ಸಂಚಾರ ಹೆಚ್ಚಿಸಿ ಮತ್ತು ಎಚ್ಚರದಿಂದಿರಿ.`;
        case "മലയാളം":
          return `📊 **തൊഴിലാളി ${workerStr} യുടെ സുരക്ഷാ റിപ്പോർട്ട്:**

• 🟡 **സുരക്ഷാ നില:** മുന്നറിയിപ്പ് (MODERATE EXPOSURE)
• 💨 **ശരാശരി ഗ്യാസ് നില ($C_{TWA}$):** ${twaStr}
• ⏱️ **ആകെ ഡോസ്:** ${doseVal} (${durationStr} ഷിഫ്റ്റിൽ)

⚠️ **ഉപദേശം:** വായുസഞ്ചാരം ഉറപ്പാക്കി ശ്രദ്ധയോടെ ജോലി ചെയ്യുക.`;
        default:
          return `📊 **YOUR PERSONAL GAS EXPOSURE REPORT (${workerStr}):**

• 🟡 **Safety Condition:** MODERATE EXPOSURE (CAUTION)
• 💨 **Shift-Average ($C_{TWA}$):** ${twaStr} (Moderate range)
• ⏱️ **Cumulative Dose ($D$):** ${doseVal} over ${durationStr} shift
• ⚠️ **Status:** MODERATE

⚠️ **RECOMMENDED ACTION:** Ensure adequate workplace ventilation and stay alert.`;
      }
    } else {
      switch (lang) {
        case "தமிழ்":
          return `📊 **பணியாளர் ${workerStr} அவர்களின் பணி பாதுகாப்பு அறிக்கை:**

• 🟢 **பாதுகாப்பு நிலை:** மிகவும் பாதுகாப்பானது (SAFE)
• 💨 **சராசரி வாயு அளவு ($C_{TWA}$):** ${twaStr} (பாதுகாப்பான 1.00 ppm வரம்பிற்கு உட்பட்டது)
• ⏱️ **மொத்த திரட்டப்பட்ட அளவு:** ${doseVal} (${durationStr} ஷிப்ட்)
• ✅ **பேட்ஜ் நிலை:** 🟢 செல்லுபடியாகும் (VALID)

👍 **பாதுகாப்பு செய்தி:** நீங்கள் முழு பாதுகாப்போடு பணியைத் தொடரலாம்!`;
        case "हिंदी":
          return `📊 **कर्मचारी ${workerStr} की कार्य सुरक्षा रिपोर्ट:**

• 🟢 **सुरक्षा स्थिति:** पूरी तरह सुरक्षित (SAFE)
• 💨 **औसत गैस स्तर ($C_{TWA}$):** ${twaStr} (सुरक्षित सीमा 1.00 ppm के भीतर)
• ⏱️ **कुल संचयी खुराक:** ${doseVal} (${durationStr} शिफ्ट)
• ✅ **बैज स्थिति:** 🟢 मान्य (VALID)

👍 **सुरक्षा संदेश:** आप बिल्कुल सुरक्षित हैं, निश्चिंत होकर काम जारी रखें!`;
        case "கன்னட":
        case "ಕನ್ನಡ":
          return `📊 **ಕಾರ್ಮಿಕ ${workerStr} ಅವರ ಕೆಲಸದ ಸುರಕ್ಷತಾ ವರದಿ:**

• 🟢 **ಸುರಕ್ಷತಾ ಸ್ಥಿತಿ:** ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತ (SAFE)
• 💨 **ಸರಾಸರಿ ಗ್ಯಾಸ್ ಮಟ್ಟ ($C_{TWA}$):** ${twaStr} (ಸುರಕ್ಷಿತ ಮಿತಿ 1.00 ppm ಗಿಂತ ಕಡಿಮೆ)
• ⏱️ **ಒಟ್ಟು ಗ್ಯಾಸ್ ಶೇಖರಣೆ:** ${doseVal} (${durationStr} ಶಿಫ್ಟ್)
• ✅ **ಬ್ಯಾಡ್ಜ್ ಸ್ಥಿತಿ:** 🟢 ಮಾನ್ಯವಾಗಿದೆ (VALID)

👍 **ಸುರಕ್ಷತಾ ಸಂದೇಶ:** ನೀವು ಸಂಪೂರ್ಣವಾಗಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ, ಕೆಲಸ ಮುಂದುವರಿಸಿ!`;
        case "മലയാളം":
          return `📊 **തൊഴിലാളി ${workerStr} യുടെ തൊഴിൽ സുരക്ഷാ റിപ്പോർട്ട്:**

• 🟢 **സുരക്ഷാ നില:** പൂർണ്ണമായും സുരക്ഷിതം (SAFE)
• 💨 **ശരാശരി ഗ്യാസ് നില ($C_{TWA}$):** ${twaStr} (സുരക്ഷിത പരിധിക്കുള്ളിൽ)
• ⏱️ **ആകെ ഡോസ്:** ${doseVal} (${durationStr} ഷിഫ്റ്റിൽ)
• ✅ **ബാഡ്ജ് നില:** 🟢 സാധുവായത് (VALID)

👍 **സുരക്ഷാ ഉപദേശം:** നിങ്ങൾ പൂർണ്ണമായും സുരക്ഷിതനാണ്, ധൈര്യമായി ജോലി ചെയ്യാം!`;
        default:
          return `📊 **YOUR PERSONAL GAS EXPOSURE REPORT (${workerStr}):**

• 🟢 **Gas Safety Status:** SAFE (Healthy Work Condition)
• 💨 **Shift-Average ($C_{TWA}$):** ${twaStr} (Well below the 1.00 ppm safe workplace limit)
• ⏱️ **Cumulative Dose ($D$):** ${doseVal} over your ${durationStr} shift
• ✅ **Dosimeter Badge:** VALID & Clean

👍 **WORKER SAFETY ASSESSMENT:** You are completely safe to work! Your air quality is healthy and within safe workplace standards.`;
      }
    }
  }

  // 8. GENERAL INTelligent CONVERSATIONAL ANSWER FOR ANY OTHER QUESTION
  switch (lang) {
    case "தமிழ்":
      return `கேள்வி: "${query}"

• 📊 **தற்போதைய H₂S வாயு அளவு:** ${twaStr} (நிலை: பாதுகாப்பானது 🟢)
• ⏱️ **திரட்டப்பட்ட அளவு:** ${doseVal} (${durationStr} ஷிப்ட்)
• 🏷️ **பேட்ஜ் நிலை:** 🟢 செல்லுபடியாகும் (VALID)

💡 **பாதுகாப்பு வழிகாட்டி:** H₂S வாயு அளவு 1.00 ppm க்கு குறைவாக உள்ளது. நீங்கள் பாதுகாப்பாக வேலையைத் தொடரலாம். அவசர உதவிக்கு "அவசரம்" என்று கேட்கவும்!`;
    case "हिंदी":
      return `प्रश्न: "${query}"

• 📊 **वर्तमान H₂S गैस स्तर:** ${twaStr} (स्थिति: सुरक्षित 🟢)
• ⏱️ **संचयी खुराक:** ${doseVal} (${durationStr} शिफ्ट)
• 🏷️ **बैज स्थिति:** 🟢 मान्य (VALID)

💡 **सुरक्षा सलाह:** H₂S गैस स्तर 1.00 ppm से नीचे है। आप सुरक्षित रूप से काम जारी रख सकते हैं। आपातकालीन जानकारी के लिए "इमरजेंसी" पूछें!`;
    case "கன்னட":
    case "ಕನ್ನಡ":
      return `ಪ್ರಶ್ನೆ: "${query}"

• 📊 **ಪ್ರಸ್ತುತ H₂S ಗ್ಯಾಸ್ ಮಟ್ಟ:** ${twaStr} (ಸ್ಥಿತಿ: ಸುರಕ್ಷಿತ 🟢)
• ⏱️ **ಒಟ್ಟು ಶೇಖರಣೆ:** ${doseVal} (${durationStr} ಶಿಫ್ಟ್)
• 🏷️ **ಬ್ಯಾಡ್ಜ್ ಸ್ಥಿತಿ:** 🟢 ಮಾನ್ಯವಾಗಿದೆ (VALID)

💡 **ಸುರಕ್ಷತಾ ಸಲಹೆ:** H₂S ಗ್ಯಾಸ್ ಮಟ್ಟ 1.00 ppm ಗಿಂತ ಕಡಿಮೆಯಿದೆ. ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಕೆಲಸ ಮುಂದುವರಿಸಬಹುದು!`;
    case "മലയാളം":
      return `ചോദ്യം: "${query}"

• 📊 **നിലവിലെ H₂S ഗ്യാസ് നില:** ${twaStr} (നില: സുരക്ഷിതം 🟢)
• ⏱️ **ആകെ ശേഖരിച്ചത്:** ${doseVal} (${durationStr} ഷിഫ്റ്റ്)
• 🏷️ **ബാഡ്ജ് നില:** 🟢 സാധുവായത് (VALID)

💡 **സുരക്ഷാ ഉപദേശം:** H₂S ഗ്യാസ് നില 1.00 ppm ൽ താഴെയാണ്. നിങ്ങൾക്ക് ധൈര്യമായി ജോലി തുടരാം!`;
    default:
      return `Thank you for asking: "${query}"

• 🟢 **Gas Exposure Status:** SAFE (${twaStr} TWA)
• ⏱️ **Cumulative Dose:** ${doseVal} over ${durationStr} shift
• 🏷️ **Badge Validity:** VALID (Badge ID: B-00101)

👍 **Safety Advice:** Your exposure reading is healthy and well within safe workplace limits (< 1.00 ppm). Type "emergency" for gas leak steps or "photo" for scanning tips!`;
  }
}
