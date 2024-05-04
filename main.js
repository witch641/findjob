const { OpenAI } = require("openai");
const { By, Key, until } = require("selenium-webdriver");
const { getResumeInfo, sleep } = require("./utils");
const { getDriver, openBrowserWithOptions, logIn, getJobDescriptionByIndex } = require("./domOperationMock");

const openai = new OpenAI({
  baseURL: "https://api.chatanywhere.com.cn",
  apiKey: "",
});

const resumeInfo = getResumeInfo();

async function chat(jobDescription) {
  const askMessage = `你好，这是我的简历：${resumeInfo}，这是我所应聘公司的要求：${jobDescription}。我希望您能帮我直接给HR写一个礼貌专业的求职新消息，要求能够用专业的语言将简历中的技能结合应聘工作的描述，来阐述自己的优势，尽最大可能打动招聘者。并且请您始终使用中文来进行消息的编写,开头是招聘负责人。这是一封完整的求职信，不要包含求职信内容以外的东西，例如“根据您上传的求职要求和个人简历，我来帮您起草一封求职邮件：”这一类的内容，以便于我直接自动化复制粘贴发送，另外，我的名字是，字数控制在80字左右为宜`;
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: askMessage,
        },
      ],
      model: "gpt-3.5-turbo",
    });
    const formattedMessage = completion.choices[0].message.content.replace(/\n/g, " ");
    return formattedMessage;
  } catch (error) {
    console.error(`gpt返回时发生错误: ${error}`);
    throw new Error(`gpt返回时发生错误: ${error}`);
  }
}

async function sendResponseToChatBox(driver, response) {
  try {
    const chatBox = await driver.findElement(By.xpath("//*[@id='chat-input']"));
    await chatBox.clear();
    await chatBox.sendKeys(response);
    await sleep(1000);
    await chatBox.sendKeys(Key.RETURN);
    await sleep(2000);
  } catch (error) {
    console.error(`发送响应到聊天框时发生错误: ${error}`);
    throw new Error(`发送响应到聊天框时发生错误: ${error}`);
  }
}

async function main(url, browserType) {
  let driver;
  try {
    driver = await openBrowserWithOptions(url, browserType);
    let jobIndex = 10;
    const maxJobs = 100; // 设置最大职位数量以防止无限循环
    while (jobIndex <= maxJobs) {
      const jobDescription = await getJobDescriptionByIndex(jobIndex);
      console.log(`职位描述信息：${jobDescription}`);
      if (jobDescription) {
        const response = await chat(jobDescription);
        console.log("gpt给的回复", response);
        const contactButton = await driver.findElement(By.xpath("//*[@id='wrap']/div[2]/div[2]/div/div/div[2]/div/div[1]/div[2]/a[2]"));
        await contactButton.click();
        const chatBox = await driver.wait(until.elementLocated(By.xpath("//*[@id='chat-input']")), 10000);
        await sendResponseToChatBox(driver, response);
        await driver.navigate().back();
        await sleep(2000);
      }
      jobIndex += 1;
    }
  } catch (error) {
    console.error(`发生错误: ${error}`);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

const url = "https://www.zhipin.com/web/geek/job-recommend?salary=403";
const browserType = "chrome";
main(url, browserType);
