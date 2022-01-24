package panda.reppy.entities;

public class QuestionBuilder {

    private String authorId;
    private String title;
    private String body;
    private String codeblock;
    private String output;

    public QuestionBuilder(String authorId) {
        this.authorId = authorId;
    }

    public String getAuthorId() {
        return authorId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getCodeblock() {
        return codeblock;
    }

    public void setCodeblock(String codeblock) {
        this.codeblock = codeblock;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }
}
