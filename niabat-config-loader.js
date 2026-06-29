/**
 * niabat-config-loader.js
 * ══════════════════════════════════════════════════
 * ملف تحميل إعدادات النيابة — مشترك بين جميع الأنظمة
 * أضف هذا السطر في <head> لأي ملف HTML تريد ربطه:
 *   <script src="niabat-config-loader.js"></script>
 * ══════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var CFG_KEY = 'niabat_config';

  var DEFAULT_CONFIG = {
    prosecutionName: 'نيابة مرور عين الصيرة',
    fiscalYear: new Date().getFullYear(),
    agents: []
  };

  /* ── قراءة الإعدادات ── */
  function loadConfig() {
    try {
      var saved = localStorage.getItem(CFG_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        return {
          prosecutionName: parsed.prosecutionName || DEFAULT_CONFIG.prosecutionName,
          fiscalYear: parsed.fiscalYear || DEFAULT_CONFIG.fiscalYear,
          agents: Array.isArray(parsed.agents) ? parsed.agents : DEFAULT_CONFIG.agents,
          stations: Array.isArray(parsed.stations) ? parsed.stations : []
        };
      }
    } catch (e) { /* تجاهل الأخطاء */ }
    return {
      prosecutionName: DEFAULT_CONFIG.prosecutionName,
      fiscalYear: DEFAULT_CONFIG.fiscalYear,
      agents: DEFAULT_CONFIG.agents.slice(),
      stations: []
    };
  }

  /* ── تطبيق اسم النيابة ── */
  function applyProsecutionName(cfg) {
    var name = cfg.prosecutionName;

    /* العناصر التي تحمل اسم النيابة مباشرة */
    var targets = document.querySelectorAll(
      '#niabat-prosecution-name, #niabat-doc-title, [data-config="prosecution-name"]'
    );
    targets.forEach(function (el) {
      el.textContent = name;
    });

    /* عنوان الصفحة */
    if (document.title && document.title.indexOf('نيابة') !== -1) {
      document.title = document.title.replace(/نيابة مرور [\u0600-\u06FF\s]+/g, name);
    }
  }

  /* ── تطبيق أسماء الوكلاء على قوائم الاختيار ── */
  function applyAgents(cfg) {
    var agents = cfg.agents;
    if (!agents || agents.length === 0) return;

    /* البحث عن أي <select> مرتبط بالوكلاء */
    var selects = document.querySelectorAll(
      'select[data-config="agent-select"], ' +
      'select#agentSelect, select#wakeel, select#wakeelSelect, ' +
      'select#officerSelect, select#signerSelect, select#delegateName, ' +
      'select[id*="agent"], select[id*="wakil"], select[id*="wakeel"], ' +
      'select[name*="agent"], select[name*="wakil"]'
    );

    selects.forEach(function (select) {
      var currentVal = select.value;

      /* احتفظ بالخيارات الثابتة (الخيار الأول الفارغ أو ذو data-static) */
      var staticOptions = Array.from(select.options).filter(function (opt) {
        return opt.dataset.static === 'true' || (opt.value === '' && select.options[0] === opt);
      });

      /* أعد بناء القائمة */
      select.innerHTML = '';
      staticOptions.forEach(function (opt) { select.appendChild(opt); });

      agents.forEach(function (agentName) {
        if (!agentName) return;
        var opt = document.createElement('option');
        opt.value = agentName;
        opt.textContent = agentName;
        select.appendChild(opt);
      });

      /* أعد تحديد القيمة السابقة إن وُجدت */
      if (currentVal) select.value = currentVal;
    });
  }

  /* ── تطبيق السنة القضائية على حقول السنة ── */
  function applyFiscalYear(cfg) {
    var year = cfg.fiscalYear;
    if (!year) return;
    /* حقول input الخاصة بالسنة */
    var yearInputs = document.querySelectorAll(
      'input#input-year, input[data-config="fiscal-year"]'
    );
    yearInputs.forEach(function(el) {
      /* لا نغير لو المستخدم غيّر القيمة يدوياً بالفعل */
      if (!el.dataset.userModified) {
        el.value = year;
        /* أطلق event عشان الكود المرتبط بالحقل يتحدث */
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  /* ── تطبيق الإعدادات كاملة ── */
  function applyConfig(cfg) {
    if (!cfg) return;
    applyProsecutionName(cfg);
    applyAgents(cfg);
    applyFiscalYear(cfg);
  }

  /* ── تطبيق فور اكتمال تحميل الصفحة ── */
  function init() {
    applyConfig(loadConfig());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── استقبال تحديثات من البوابة الرئيسية (postMessage) ── */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'NIABAT_CONFIG_UPDATE' && e.data.config) {
      applyConfig(e.data.config);
    }
    /* رد على طلب الإعدادات من البوابة */
    if (e.data && e.data.type === 'NIABAT_CONFIG_REQUEST') {
      try {
        e.source.postMessage(
          { type: 'NIABAT_CONFIG_RESPONSE', config: loadConfig() },
          '*'
        );
      } catch (err) {}
    }
  });

  /* ── استقبال تغييرات localStorage من نوافذ أخرى ── */
  window.addEventListener('storage', function (e) {
    if (e.key === CFG_KEY) {
      applyConfig(loadConfig());
    }
  });

  /* ── تصدير للاستخدام من JavaScript الصفحة (اختياري) ── */
  window.NiabatConfig = {
    load: loadConfig,
    apply: applyConfig,
    get prosecutionName() { return loadConfig().prosecutionName; },
    get fiscalYear() { return loadConfig().fiscalYear; },
    get agents() { return loadConfig().agents; },
    get stations() { return loadConfig().stations; }
  };

})();