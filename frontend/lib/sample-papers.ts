import type { Paper, ResearchProject } from "@/types/paper";

export const SAMPLE_PAPERS: Paper[] = [
  {
    id: "paper-attention-2017",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Llion Jones", "Aidan N. Gomez", "Łukasz Kaiser", "Illia Polosukhin"],
    venue: "NeurIPS 2017",
    year: 2017,
    doi: "10.48550/arXiv.1706.03762",
    source_url: "https://arxiv.org/abs/1706.03762",
    kind: "text",
    tags: ["Transformers", "Deep Learning", "NLP", "Attention"],
    reading_status: "starred",
    progress: 85,
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    content: `# Attention Is All You Need

Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin

## Abstract
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

## 1. Introduction
Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures.

Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.

Recent work has achieved significant improvements in computational efficiency through factorization tricks and conditional computation, while also improving model performance in case of the latter. However, the fundamental constraint of sequential computation remains.

Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences. In all but a few cases, however, such attention mechanisms are used in conjunction with a recurrent network.

In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.

## 2. Background
The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet and ConvS2S, all of which use convolutional neural networks as basic building blocks, computing hidden representations in parallel for all input and output positions. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet. This makes it more difficult to learn dependencies between distant positions.

In the Transformer this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions, an effect we counteract with Multi-Head Attention as described in Section 3.2.

Self-attention, sometimes called intra-attention, is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence. Self-attention has been used successfully in a variety of tasks including reading comprehension, abstractive summarization, textual entailment and learning task-independent sentence representations.

## 3. Model Architecture
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x_1, ..., x_n) to a sequence of continuous representations z = (z_1, ..., z_n). Given z, the decoder then generates an output sequence (y_1, ..., y_m) of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder, shown in the left and right halves of Figure 1, respectively.

### 3.1 Encoder and Decoder Stacks
Encoder: The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)), where Sublayer(x) is the function implemented by the sub-layer itself. To facilitate these residual connections, all sub-layers in the model, as well as the embedding layers, produce outputs of dimension d_model = 512.

Decoder: The decoder is also composed of a stack of N = 6 identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack. Similar to the encoder, we employ residual connections around each of the sub-layers, followed by layer normalization. We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions. This masking, combined with fact that the output embeddings are offset by one position, ensures that the predictions for position i can depend only on the known outputs at positions less than i.

### 3.2 Scaled Dot-Product Attention
We call our particular attention 'Scaled Dot-Product Attention'. The input consists of queries and keys of dimension d_k, and values of dimension d_v. We compute the dot products of the query with all keys, divide each by sqrt(d_k), and apply a softmax function to obtain the weights on the values.

In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed into matrices K and V. We compute the matrix of outputs as:

Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V

The two most commonly used attention functions are additive attention and dot-product (multiplicative) attention. Dot-product attention is identical to our algorithm, except for the scaling factor of 1 / sqrt(d_k). Additive attention computes the compatibility function using a feed-forward network with a single hidden layer. While the two are similar in theoretical complexity, dot-product attention is much faster and more space-efficient in practice, since it can be implemented using highly optimized matrix multiplication code.

While for small values of d_k the two mechanisms perform similarly, additive attention outperforms dot product attention without scaling for larger values of d_k. We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(d_k).

### 3.3 Multi-Head Attention
Instead of performing a single attention function with d_model-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding d_v-dimensional output values. These are concatenated and once again projected, resulting in the final values.

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.

MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O
where head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)

In this work we employ h = 8 parallel attention layers, or heads. For each of these we use d_k = d_v = d_model / h = 64. Because of the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.

## 4. Why Self-Attention
In this section we compare various aspects of self-attention layers to the recurrent and convolutional layers commonly used for mapping one variable-length sequence of symbol representations to another sequence of equal length.

As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires O(n) sequential operations. In terms of computational complexity, self-attention layers are faster than recurrent layers when the sequence length n is smaller than the representation dimensionality d, which is most often the case with sentence representations used by state-of-the-art models in machine translation.

A side benefit of self-attention is that it can yield more interpretable models. We inspect attention distributions from our models and find examples that show attention heads performing different tasks and learning to exhibit behavior related to the syntactic and semantic structure of sentences.

## 5. Conclusion
In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.

For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieve a new state of the art. In the former task our best model outperforms even all previously reported ensembles.`,
    annotations: [
      {
        id: "anno-1",
        paperId: "paper-attention-2017",
        text: "The Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.",
        comment: "Core thesis statement: eliminates recurrence completely in favor of parallel self-attention.",
        color: "yellow",
        section: "1. Introduction",
        created_at: "2026-10-12T14:22:00.000Z"
      },
      {
        id: "anno-2",
        paperId: "paper-attention-2017",
        text: "To counteract this effect, we scale the dot products by 1 / sqrt(d_k).",
        comment: "Key architectural trick to avoid vanishing gradients in softmax when dimension grows large.",
        color: "green",
        section: "3.2 Scaled Dot-Product Attention",
        created_at: "2026-10-12T14:35:00.000Z"
      }
    ],
    created_at: "2026-10-12T10:00:00.000Z",
    updated_at: "2026-10-14T08:30:00.000Z",
  },
  {
    id: "paper-rag-2020",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus", "Fabio Petroni", "Vladimir Karpukhin", "Naman Goyal", "Heinrich Küttler", "Mike Lewis", "Wen-tau Yih", "Tim Rocktäschel", "Sebastian Riedel", "Douwe Kiela"],
    venue: "NeurIPS 2020",
    year: 2020,
    doi: "10.48550/arXiv.2005.11401",
    source_url: "https://arxiv.org/abs/2005.11401",
    kind: "text",
    tags: ["RAG", "Information Retrieval", "NLP", "Hallucination"],
    reading_status: "reading",
    progress: 60,
    abstract: "Large pre-trained language models store factual knowledge in their parameters, but their ability to access and manipulate that knowledge remains limited. We explore retrieval-augmented generation (RAG) models, which combine pre-trained parametric and non-parametric memory for language generation. We introduce RAG-Sequence and RAG-Token architectures evaluated on Natural Questions, WebQuestions, and CuratedTREC.",
    content: `# Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, Sebastian Riedel, Douwe Kiela

## Abstract
Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to precisely access and manipulate knowledge is still limited, and they struggle on knowledge-intensive tasks. Furthermore, their internal representations cannot be easily expanded or revised, and their decisions lack transparent provenance.

In this work, we develop a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) — models which combine pre-trained parametric memory (a seq2seq model) and non-parametric memory (a dense vector index of Wikipedia) accessed via a pre-trained neural retriever. We compare two formulations: RAG-Sequence, which uses the same retrieved document to generate the entire sequence, and RAG-Token, which can use different documents per token. We evaluate our models on a wide range of knowledge-intensive tasks and set state-of-the-art results on open-domain QA.

## 1. Introduction
Pre-trained neural language models learn a substantial amount of in-depth world knowledge from data. Despite these successes, such models have significant shortcomings: they cannot easily expand or revise their memory, can produce hallucinations and 'unfaithful' generations, and cannot provide verifiable citations for their outputs.

Hybrid models that combine parametric memory with non-parametric (retrieval-based) memories can address these issues, as knowledge can be directly updated, inspected, and interpreted.

In this paper, we bring hybrid parametric/non-parametric memory to sequence-to-sequence generation tasks. We build RAG models where the parametric memory is a pre-trained seq2seq transformer (BART), and the non-parametric memory is a dense vector index of Wikipedia accessed with Dense Passage Retrieval (DPR).

## 2. Methods
Our RAG models use the input sequence x to retrieve top-k passages z, and then use these passages along with x to generate the target sequence y.

### 2.1 RAG-Sequence Model
The RAG-Sequence model uses the same retrieved document to generate the complete sequence. Formally, it treats the retrieved document as a latent variable that is marginalized out to get the seq2seq probability via top-K approximation:
p_RAG-Seq(y|x) ≈ sum_{z in top-k} p_η(z|x) * prod_i p_θ(y_i | x, z, y_{1:i-1})

### 2.2 RAG-Token Model
In the RAG-Token model, the generator can attend to different latent passages for each generated token:
p_RAG-Token(y|x) = prod_i [ sum_{z in top-k} p_η(z|x) * p_θ(y_i | x, z, y_{1:i-1}) ]
This allows the generator to synthesize content from multiple passages across different parts of an answer.

## 3. Key Findings & Discussion
RAG models achieve new state-of-the-art results on open-domain question answering benchmarks (Natural Questions, WebQuestions, CuratedTREC) without requiring expensive joint retriever-reader extraction pipelines. Furthermore, human evaluations indicate that generations from RAG are more factual, less prone to hallucination, and can be verified against the cited Wikipedia passages.`,
    annotations: [
      {
        id: "anno-rag-1",
        paperId: "paper-rag-2020",
        text: "they cannot easily expand or revise their memory, can produce hallucinations and 'unfaithful' generations, and cannot provide verifiable citations for their outputs.",
        comment: "Three core motivations for RAG vs pure parametric weights.",
        color: "blue",
        section: "1. Introduction",
        created_at: "2026-10-13T11:15:00.000Z"
      }
    ],
    created_at: "2026-10-13T09:00:00.000Z",
    updated_at: "2026-10-14T07:15:00.000Z",
  },
  {
    id: "paper-gpt3-2020",
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah", "Jared Kaplan", "Prafulla Dhariwal", "Arvind Neelakantan", "Pranav Shyam", "Girish Sastry", "Amanda Askell", "Sandhini Agarwal", "Ariel Herbert-Voss", "Gretchen Krueger", "Tom Henighan", "Rewon Child", "Aditya Ramesh", "Daniel M. Ziegler", "Jeffrey Wu", "Clemens Winter", "Christopher Hesse", "Mark Chen", "Eric Sigler", "Mateusz Litwin", "Scott Gray", "Benjamin Chess", "Jack Clark", "Christopher Berner", "Sam McCandlish", "Alec Radford", "Ilya Sutskever", "Dario Amodei"],
    venue: "NeurIPS 2020",
    year: 2020,
    doi: "10.48550/arXiv.2005.14165",
    source_url: "https://arxiv.org/abs/2005.14165",
    kind: "text",
    tags: ["LLM", "FewShot", "InContextLearning", "Scaling"],
    reading_status: "completed",
    progress: 100,
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While also high-performing, this setup still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches. We train GPT-3, an autoregressive language model with 175 billion parameters.",
    content: `# Language Models are Few-Shot Learners

Tom B. Brown et al. (OpenAI)

## Abstract
Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. By contrast, humans can generally perform a new language task from only a few examples or from simple instructions.

Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches. Specifically, we train GPT-3, an autoregressive language model with 175 billion parameters, 10x more than any previous non-sparse language model, and test its performance in the few-shot setting.

## 1. Introduction
The dominant paradigm in NLP has shifted towards pre-training on task-agnostic datasets followed by task-specific fine-tuning. However, this approach has notable limitations:
1. The need for large labelled datasets for every new task limits the applicability of language models.
2. The potential to exploit spurious correlations in training data increases with model capacity and task-specific fine-tuning.
3. Humans do not require large supervised datasets to learn most language tasks.

An alternative is in-context learning, where the model conditions on a natural language task description and a few demonstrations at inference time without gradient updates.

## 2. Approach & Architecture
We evaluate GPT-3 under 3 conditions:
- **Few-shot learning**: We allow 10 to 100 demonstrations in the model's context window.
- **One-shot learning**: We allow only a single demonstration.
- **Zero-shot learning**: No demonstrations are allowed, only an instruction in natural language.

GPT-3 uses the same basic architecture as GPT-2, including modified initialization, pre-normalization, and reversible tokenization, with alternating dense and locally banded sparse attention patterns in the layers, scaled up to 175B parameters with 96 layers and 3.2M batch size.

## 3. Results & Limitations
GPT-3 achieves high proficiency on translation, question answering, cloze tasks, and unscrambling words. However, GPT-3 still struggles on common-sense physics reasoning (e.g. 'If I put cheese in the fridge, will it melt?'), can repeat itself in long text generation, and retains societal biases reflecting its web training distribution.`,
    annotations: [
      {
        id: "anno-gpt3-1",
        paperId: "paper-gpt3-2020",
        text: "An alternative is in-context learning, where the model conditions on a natural language task description and a few demonstrations at inference time without gradient updates.",
        comment: "Definition of in-context learning at scale.",
        color: "purple",
        section: "1. Introduction",
        created_at: "2026-10-14T06:00:00.000Z"
      }
    ],
    created_at: "2026-10-14T05:00:00.000Z",
    updated_at: "2026-10-14T08:00:00.000Z",
  }
];

export const SAMPLE_PROJECTS: ResearchProject[] = [
  {
    id: "proj-transformer-synthesis",
    name: "Foundation Models & Literature Synthesis",
    description: "Systematic comparison of attention architectures, retrieval-augmented grounding, and parameter-scaled in-context learning.",
    paperIds: ["paper-attention-2017", "paper-rag-2020", "paper-gpt3-2020"],
    columns: [
      { id: "col-objective", name: "Core Objective", description: "Primary research goal and problem tackled" },
      { id: "col-arch", name: "Model Architecture", description: "Key neural network building blocks" },
      { id: "col-dataset", name: "Training / Benchmark Data", description: "Evaluation corpora or pre-training corpora" },
      { id: "col-metric", name: "Primary Metrics & Result", description: "Key quantitative findings reported" },
      { id: "col-limitation", name: "Key Limitations", description: "Reported threats to validity or computational costs" }
    ],
    extractions: [
      {
        paperId: "paper-attention-2017",
        columnId: "col-objective",
        value: "Replace recurrent/convolutional sequence transduction with pure self-attention to unlock full parallelization.",
        quote: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-attention-2017",
        columnId: "col-arch",
        value: "6-layer Encoder-Decoder stack with 8-head Scaled Dot-Product Attention (d_model=512, d_k=64).",
        quote: "The encoder is composed of a stack of N = 6 identical layers... we employ h = 8 parallel attention layers.",
        sectionOrPage: "§3.1 & §3.3"
      },
      {
        paperId: "paper-attention-2017",
        columnId: "col-dataset",
        value: "WMT 2014 English-German (4.5M pairs) and WMT 2014 English-French (36M pairs).",
        quote: "Our model achieves 28.4 BLEU on the WMT 2014 English-to-German... 41.8 on WMT 2014 English-to-French.",
        sectionOrPage: "Abstract & §5"
      },
      {
        paperId: "paper-attention-2017",
        columnId: "col-metric",
        value: "28.4 BLEU on EN-DE (+2.0 over SOTA); 41.8 BLEU on EN-FR trained in 3.5 days on 8 P100 GPUs.",
        quote: "improving over the existing best results by over 2 BLEU... establishing a new single-model state-of-the-art.",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-attention-2017",
        columnId: "col-limitation",
        value: "Reduced effective resolution from averaging attention positions, quadratic complexity with sequence length O(n^2).",
        quote: "albeit at the cost of reduced effective resolution due to averaging attention-weighted positions",
        sectionOrPage: "§2 Background"
      },
      {
        paperId: "paper-rag-2020",
        columnId: "col-objective",
        value: "Augment pre-trained parametric generator memory with dense non-parametric vector retrieval to reduce hallucinations and provide verifiable citations.",
        quote: "combine pre-trained parametric memory (a seq2seq model) and non-parametric memory (a dense vector index of Wikipedia)",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-rag-2020",
        columnId: "col-arch",
        value: "DPR (Dense Passage Retriever) coupled with BART seq2seq generator in RAG-Sequence or RAG-Token configurations.",
        quote: "parametric memory is a pre-trained seq2seq transformer (BART), and non-parametric memory is a dense vector index accessed with DPR.",
        sectionOrPage: "§1 Introduction"
      },
      {
        paperId: "paper-rag-2020",
        columnId: "col-dataset",
        value: "Natural Questions, WebQuestions, CuratedTREC, MS-MARCO, and Jeopardy question generation.",
        quote: "We evaluate our models on a wide range of knowledge-intensive tasks and set state-of-the-art results on open-domain QA.",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-rag-2020",
        columnId: "col-metric",
        value: "44.5% exact match on Natural Questions; significantly lower hallucination rate verified by human judges.",
        quote: "generations from RAG are more factual, less prone to hallucination, and can be verified against cited Wikipedia passages.",
        sectionOrPage: "§3 Key Findings"
      },
      {
        paperId: "paper-rag-2020",
        columnId: "col-limitation",
        value: "Retrieval latency overhead, retrieval index staleness, reliance on top-k coverage quality.",
        quote: "treats the retrieved document as a latent variable that is marginalized out to get the seq2seq probability via top-K approximation",
        sectionOrPage: "§2.1 Methods"
      },
      {
        paperId: "paper-gpt3-2020",
        columnId: "col-objective",
        value: "Investigate whether scaling language models to 175B parameters enables competitive few-shot in-context learning without task fine-tuning.",
        quote: "scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-gpt3-2020",
        columnId: "col-arch",
        value: "Autoregressive decoder-only Transformer with 96 layers, 175B parameters, alternating dense and sparse attention.",
        quote: "scaled up to 175B parameters with 96 layers and 3.2M batch size.",
        sectionOrPage: "§2 Approach"
      },
      {
        paperId: "paper-gpt3-2020",
        columnId: "col-dataset",
        value: "Filtered Common Crawl, WebText2, Books1, Books2, and Wikipedia (total ~300B tokens).",
        quote: "pre-training on a large corpus of text followed by few-shot in-context evaluation.",
        sectionOrPage: "Abstract"
      },
      {
        paperId: "paper-gpt3-2020",
        columnId: "col-metric",
        value: "Strong few-shot accuracy on SuperGLUE, TriviaQA (64.3%), and arithmetic without gradient updates.",
        quote: "GPT-3 achieves high proficiency on translation, question answering, cloze tasks, and unscrambling words.",
        sectionOrPage: "§3 Results"
      },
      {
        paperId: "paper-gpt3-2020",
        columnId: "col-limitation",
        value: "Common-sense physical reasoning deficits, repetition, inability to update knowledge post-training, immense training energy cost.",
        quote: "still struggles on common-sense physics reasoning... can repeat itself in long text generation, and retains societal biases.",
        sectionOrPage: "§3 Limitations"
      }
    ],
    notes: "Synthesis insight: While Transformers (2017) provide the foundational parallel compute mechanism and GPT-3 (2020) scales parametric capacity, RAG (2020) solves the critical provenance, verifiability, and knowledge staleness challenges necessary for trustworthy research systems.",
    created_at: "2026-10-14T07:00:00.000Z",
    updated_at: "2026-10-14T08:45:00.000Z"
  }
];
