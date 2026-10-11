---
title: 大语言模型开发实践 之 基于个人知识库的问答助手
date: 2023-12-16 22:00:00 +0900
categories: [Study notes, LLM]
tags: [large language models, langchain]
math: true
---

## 准备工作

### 读取OpenAI的API key

获取API key的过程在此省略，具体内容可以参照 **[这里](https://datawhalechina.github.io/llm-universe/#/C2/2.%20%E8%B0%83%E7%94%A8ChatGPT?id=_2-%e8%8e%b7%e5%8f%96%e5%b9%b6%e9%85%8d%e7%bd%ae-openai-api-key)** 。将获取的key保存到项目根目录下的`.env`文件中，存储方式如下：

```
OPENAI_API_KEY = <your key>
```

在后续项目代码中**读取key**的方式如下：

```python
import os
import openai
from dotenv import load_dotenv, find_dotenv

_ = load_dotenv(find_dotenv())
openai.api_key = os.environ["OPENAI_API_KEY"]
```

### 调用OpenAI原生接口

调用OpenAI原生接口 `ChatCompletions` 。其中，`model`指定了调用的gpt模型，常用的有：`gpt-3.5-turbo`, `gpt-4`, `gpt-4 turbo`等。`message`中包含了prompt的信息，可以通过`role`指定是 **system prompt** 还是 **user prompt** 。

具体的实现方式如下：

```python
from openai import OpenAI

client = OpenAI()
response = client.chat.completion.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Which football team won the World Cup 2014?"}
    ]
)
```

`response`作为接口`ChatCompletions`的实例化对象，返回形式如下：

```
ChatCompletion(
    id='chatcmpl-8WITAT4Ecm8UzbBvgJ7lVp60XQEI2', 
    choices=[
        Choice(
            finish_reason='stop', 
            index=0, 
            message=ChatCompletionMessage(
                content='The Germany national football team won the World Cup in 2014.', 
                role='assistant', 
                function_call=None, 
                tool_calls=None
            ), 
            logprobs=None
        )
    ], 
    created=1702708184, 
    model='gpt-4-0613', 
    object='chat.completion', 
    system_fingerprint=None, 
    usage=CompletionUsage(completion_tokens=14, prompt_tokens=18, total_tokens=32)
)
```

可以看到这个对象里包含了各种属性，而我们需要的是对于之前提出的问题的回答，而这个回答位于`content`处，所以可以通过以下方式获取到这部分的内容：

```python
print(response.choices[0].message.content)
```

### 基于LangChain框架调用ChatOpenAI接口

除了调用OpenAI的原生接口之外，我们还可以利用LangChain框架调用ChatOpenAI接口。具体方式如下：

```python
from langchain.chat_models import ChatOpenAI

chat = ChatOpenAI()
```

然后利用 **模板 (Template)** 来设置prompt，模板中的字符串可以使用format方法进行自定义填充。一个例子如下：

```python
from langchain.prompts import ChatPromptTemplate

template = """
    Translate the text \
    that is delimited by triple backticks \
    into Chinese. \
    text: ```{text}```
"""
# the instantiation of the template
chat_template = ChatPromptTemplate.from_template(template)
```

随后设置问询的具体内容：

```python
text = """
    Chat models take a list of messages as input and return a model-generated message as output. \
    Although the chat format is designed to make multi-turn conversations easy, \
    it's just as useful for single-turn tasks without any conversation.
"""
message = chat_template.format_messages(text=text)
response = chat(message)
print(response.content)
```

输出：

```
聊天模型以消息列表作为输入，并返回模型生成的消息作为输出。尽管聊天格式旨在使多轮对话变得简单，但它对于没有任何对话的单轮任务也同样有用。
```

## 项目： 基于个人知识库的问答助手

### 项目开发流程

项目开发流程示意图如下: 

<img src="/assets/img/2023-12-16-LLM_project/dev_flow.svg" class="custom-img"/>

### 项目框架

项目框架示意如下：

```
-project
    -readme.md                  * 项目说明
    -requirements.txt           * 使用依赖包的版本 
    -llm                        * LLM调用封装
        -self_llm.py            * 自定义 LLM 基类
        -call_llm.py            * 将各个 LLM 的原生接口封装在一起
        -test.ipynb             * 使用示例
    -embedding                  * embedding调用封装
        -call_embedding.py      * 调用 embedding 模型 
    -data                       * 源数据路径
    -database                   * 数据库层封装
        -create_db.py           * 处理源数据及初始化数据库封装
    -qa_chain                   * 应用层封装
        -qa_chain.py            * 封装检索问答链，返回一个检索问答链对象
        -chat_qa_chian.py       * 封装对话检索链，返回一个带有历史记录的对话检索链对象
        -get_vectordb.py        * 返回向量数据库对象
        -model_to_llm.py        * 调用模型
        -test.ipynb             * 使用示例
    -serve                      * 服务层封装
        -run_gradio.py          * 启动 Gradio 界面
        -api.py                 * 封装 FastAPI
        -run_api.sh             * 启动 API
        -test.ipynb             * 使用示例
```

## 1. 数据库搭建

### 读取PDF

使用`PyMuPDFLoader`类读取PDF文件。方式如下：

```python
from langchain.document_loaders import PyMuPDFLoader

filename = "filename"
loader = PyMuPDFLoader(f"data_base/knowledge_db/{filename}.pdf")

pages = loader.load()
# load contents
print(pages[1].page_content)
```

`loader`通过将`PyMuPDFLoader`类实例化，得到了一个读取对象。对其使用`.load()`方法可以获得一个**列表**，该列表存储了对应PDF文件每一页的一个`langchain.schema.document.Document`类的实例化对象，我们所需的文本内容存储在该对象的`page_content`属性中。

### 读取Markdown

整体与读取PDF类似，只不过使用的是`UnstructureMarkdownLoader`类。具体方式如下:

```python
from langchain.document_loader import UnstructureMarkdownLoader

filename = "filename"
loader =  UnstructureMarkdownLoader(f"data_base/knowledge_db/{filename}.md")

pages = loader.load()
print(pages[0].page_content)
```

通过`.load()`方法获取的列表中存储的还是`langchain.schema.document.Document`类的实例化对象，所以获取文本内容的方式与前文中提到的一致。

### 文本分割

由于大模型通常有最大token数的限制，所以我们需要将过长的文本分割成更小的文本，以便模型处理。这里采用`RecursiveCharacterTextSplitter`进行文本分割，具体实现方式如下:

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

CHUNK_SIZE = 500
OVERLAP_SIZE = 50

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=OVERLAP_SIZE
)
split_docs = text_splitter.split_documents(pages)
```

这里`pages`是 **[上文](#读取pdf)** 中读取完成的文档内容。`chunk_size`指的是分割过后每个子块中包含的字符数，`chunk_overlap`指的是各个子块间共享的字符数。

### 文本向量化

将抽象的文本内容转换为计算机更容易处理的数字信息，这便是 **Embedding** 所实现的功能。通过Embedding，含义相近的词语将会被转化为相似度较高的向量（相似度可以使用**余弦相似度**来衡量）。这里提供两种实现embedding的方式：

- 直接调用OpenAI的模型
- 调用HuggingFace上的模型

具体实现方式如下：

```python
import numpy as np
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.embeddings.huggingface import HuggingFaceEmbeddings

embedding = OpenAIEmbeddings()
# embedding = HuggingFaceEmbeddings(model_name="moka-ai/m3e-base")

query_1 = "math"
query_2 = "number"
query_3 = "cup"

emb_1 = np.array(embedding.embed_query(query_1)).reshape(1, -1)
emb_2 = np.array(embedding.embed_query(query_2)).reshape(1, -1)
emb_3 = np.array(embedding.embed_query(query_3)).reshape(1, -1)
```

调用`.embed_query`方法将query转换为向量，并将其转换为二维的`numpy.ndarray`，以便后续的相似度计算。

向量化后的相似度采用余弦相似度来衡量，余弦相似度的取值范围为[0, 1]，越接近1代表这两个向量越相似，在这里就代表两个词的含义越接近。代码如下：

```python
from sklearn.metrics.pairwise import cosine_similarity

print(f"{query_1} and {query_2}: {cosine_similarity(emb_1, emb_2)}")
print(f"{query_1} and {query_3}: {cosine_similarity(emb_1, emb_3)}")
print(f"{query_2} and {query_3}: {cosine_similarity(emb_2, emb_3)}")
```

```
math and number: [[0.84908244]]
math and cup: [[0.81171516]]
number and cup: [[0.81582303]]
```

可以看到 **数学** 与 **数字** 在含义上的确更加接近，相比起 **杯子** 而言。

# 附录

参考链接：
- [https://datawhalechina.github.io/llm-universe/#/](https://datawhalechina.github.io/llm-universe/#/)
- [https://platform.openai.com/docs/guides/text-generation/chat-completions-api](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)