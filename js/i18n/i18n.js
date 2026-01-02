/**
 * Internationalization (i18n) system
 */
const I18n = {
  currentLang: "en",
  languages: {
    en: null, // Will be set when LANG_EN loads
    fr: null, // Will be set when LANG_FR loads
  },

  /**
   * Initialize with available languages
   */
  init() {
    this.languages.en = typeof LANG_EN !== "undefined" ? LANG_EN : {};
    this.languages.fr = typeof LANG_FR !== "undefined" ? LANG_FR : {};

    // Try to detect browser language
    const browserLang = navigator.language.substring(0, 2);
    if (this.languages[browserLang]) {
      this.currentLang = browserLang;
    }

    // Check localStorage for saved preference
    const savedLang = localStorage.getItem("tens-language");
    if (savedLang && this.languages[savedLang]) {
      this.currentLang = savedLang;
    }
  },

  /**
   * Set the current language
   */
  setLanguage(lang) {
    if (this.languages[lang]) {
      this.currentLang = lang;
      localStorage.setItem("tens-language", lang);
      return true;
    }
    return false;
  },

  /**
   * Get a translated string
   * @param {string} key - The translation key
   * @param {object} params - Optional parameters for interpolation
   */
  t(key, params = {}) {
    const strings = this.languages[this.currentLang] || this.languages.en;
    let text = strings[key] || this.languages.en[key] || key;

    // Replace parameters like {name}, {n}, etc.
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${param}\\}`, "g"), value);
    }

    return text;
  },

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return [
      { code: "en", name: "English" },
      { code: "fr", name: "Français" },
    ];
  },

  /**
   * Get current language code
   */
  getCurrentLanguage() {
    return this.currentLang;
  },
};
