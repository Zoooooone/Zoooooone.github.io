---
layout: page
icon: fa-regular fa-square-check
order: 5
---

<div>
  {% include blogger-verification.html %}
</div>

<br>

<div id="blogger-verified-container" style="display: none;">
  {% include blogger-verified.html %}
</div>

<div id="blogger-not-verified-container" style="display: none;">
  {% include blogger-not-verified.html %}
</div>

<script>
  const isBlogger = document.cookie.split('; ').find(row => row.startsWith('blogger_visit='));
  if (isBlogger) {
    document.getElementById("blogger-verified-container").style.display = "block";
    console.log("isblogger!")
  } else {
    document.getElementById("blogger-not-verified-container").style.display = "block";
    console.log("notblogger!")
  }
</script>

