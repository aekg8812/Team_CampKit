function doPost(e) {
  try {
    var params = JSON.parse(e.postData.getDataAsString());
    var toEmail = params.toEmail;
    var targetName = params.targetName;
    var failedTasks = params.failedTasks || [];
    var type = params.type;

    var subject = "";
    var body = "";

    if (type === 1) {
      subject = "【サボり法廷】" + targetName + "さんがタスクをサボっています！";

      var lines = targetName + "さんが、\n";
      for (var i = 0; i < failedTasks.length; i++) {
        lines += (i + 1) + "回目：" + failedTasks[i] + "\n";
      }
      lines += "計" + failedTasks.length + "回のタスクをサボっています！\n";
      lines += "ぶちぎれてください🔥";

      body = lines;
    } else if (type === 2) {
      subject = "【サボり法廷】" + targetName + "さんが失踪しました";
      body = targetName + "さんが、アプリに帰ってこないので、連絡してあげましょう！";
    } else {
      subject = "【サボり法廷】密告通知";
      body = targetName + "さんに関する通知です。";
    }

    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      body: body
    });

    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"error": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
