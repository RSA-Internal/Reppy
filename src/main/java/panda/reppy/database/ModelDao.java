package panda.reppy.database;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;
import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.entities.ThreadChannel;
import org.bson.types.ObjectId;
import panda.reppy.database.models.DatabaseModel;
import panda.reppy.entities.BotMongoClient;
import panda.reppy.entities.QuestionBuilder;

import java.util.ArrayList;
import java.util.List;

import static com.mongodb.client.model.Filters.eq;

public class ModelDao {

    public ModelDao() {}

    public static List<DatabaseModel> retrieveModelsByField(final String collectionName,
                                         final String fieldName,
                                         final String fieldValue) {
        System.out.printf("Fetching models that have %s:%s in %s%n", fieldName, fieldValue, collectionName);

        List<DatabaseModel> toReturn = new ArrayList<>();
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection =
                BotMongoClient.getCollectionByName(db, collectionName);

        FindIterable<DatabaseModel> models = collection.find(eq(fieldName, fieldValue));
        models.forEach(toReturn::add);

        return toReturn;
    }

    public static DatabaseModel retrieveQuestionModel(final String threadId) {
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection = BotMongoClient.getCollectionByName(db, "questions");

        return collection.find(eq("threadId", threadId)).first();
    }

    public static DatabaseModel retrieveAnswerModel(final String threadId, final String postId) {
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection = BotMongoClient.getCollectionByName(db, "answers");

        return collection.find(eq("postId", postId)).first();
    }

    private static void saveModelData(final DatabaseModel model) {
        MongoDatabase db = BotMongoClient.getDatabase("reppy");
        MongoCollection<DatabaseModel> collection =
                BotMongoClient.getCollectionByName(db, model.getCollectionName());

        UpdateResult result = collection.replaceOne(eq("_id", model.getId()), model);
        if (result.getMatchedCount() > 0) {
            if (result.getModifiedCount() > 0) {
                System.out.println("Document updated.");
            } else
                System.out.println("No document updated, already up to date.");
        } else {
            collection.insertOne(model);
            System.out.printf("Saved %s to %s collection.%n", model.getId(), model.getCollectionName());
        }
    }

    public static void updateModelData(final DatabaseModel model) {
        saveModelData(model);
    }

    public static void generateQuestionModel(ThreadChannel threadChannel, QuestionBuilder questionBuilder) {
        DatabaseModel newQuestion = new DatabaseModel();
        newQuestion.setCollectionName("questions");
        newQuestion.setId(new ObjectId());
        newQuestion.setTitle(questionBuilder.getTitle());
        newQuestion.setAuthorId(questionBuilder.getAuthorId());
        newQuestion.setThreadId(threadChannel.getId());

        saveModelData(newQuestion);
    }

    public static void generateAnswerModel(ThreadChannel threadChannel, Member author, String postId, boolean isAccepted) {
        DatabaseModel answerModel = new DatabaseModel();
        answerModel.setCollectionName("answers");
        answerModel.setThreadId(threadChannel.getId());
        answerModel.setAuthorId(author.getId());
        answerModel.setAccepted(isAccepted);
        answerModel.setPostId(postId);

        saveModelData(answerModel);
    }

    public static void generateVoteModel(String threadChannelId,
                                         String postId, String authorId, String receiverId,
                                         boolean upvote) {
        DatabaseModel voteModel = new DatabaseModel();
        voteModel.setCollectionName("votes");
        voteModel.setThreadId(threadChannelId);
        voteModel.setPostId(postId);
        voteModel.setAuthorId(authorId);
        voteModel.setReceiverId(receiverId);
        voteModel.setVoteType(upvote);

        saveModelData(voteModel);
    }
}