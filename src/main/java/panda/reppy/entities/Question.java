package panda.reppy.entities;

public class Question {

    private final String authorId;
    private final String title;

    private String body;
    private String codeBlock;

    public Question(final String authorId, final String title) {
        this.authorId = authorId;
        this.title = title;
    }

    public void setBody(final String body) {
        this.body = body;
    }

    public void setCodeBlock(final String codeBlock) {
        this.codeBlock = codeBlock;
    }
}
